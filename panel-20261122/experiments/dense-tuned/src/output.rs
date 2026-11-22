use std::fs::{self, File, Permissions};
use std::io::BufWriter;
use std::os::unix::fs::PermissionsExt;
use std::path::Path;
use std::sync::Arc;

use parquet::basic::Compression;
use parquet::data_type::{ByteArray, ByteArrayType, Int32Type, Int64Type};
use parquet::file::properties::{EnabledStatistics, WriterProperties, WriterVersion};
use parquet::file::writer::SerializedFileWriter;
use parquet::schema::parser::parse_message_type;

use crate::input::Result;

const USER_DAILY_SCHEMA: &str = "
message user_daily {
  REQUIRED BYTE_ARRAY user_id (UTF8);
  REQUIRED INT32 day (DATE);
  REQUIRED INT64 sessions;
  REQUIRED INT64 events;
  REQUIRED INT64 revenue_cents;
  OPTIONAL BYTE_ARRAY top_category (UTF8);
}";

const CAMPAIGN_DAILY_SCHEMA: &str = "
message campaign_daily {
  REQUIRED BYTE_ARRAY campaign_id (UTF8);
  REQUIRED BYTE_ARRAY channel (UTF8);
  REQUIRED INT32 day (DATE);
  REQUIRED INT64 sessions;
  REQUIRED INT64 purchasing_sessions;
  REQUIRED INT64 revenue_cents;
  REQUIRED INT64 assisted_sessions;
}";

pub enum Column {
    Strings(Vec<ByteArray>),
    OptionalStrings(Vec<Option<ByteArray>>),
    Dates(Vec<i32>),
    Integers(Vec<i64>),
}

pub fn strings<'a>(values: impl Iterator<Item = &'a [u8]>) -> Column {
    Column::Strings(values.map(ByteArray::from).collect())
}

pub fn optional_strings<'a>(values: impl Iterator<Item = Option<&'a [u8]>>) -> Column {
    Column::OptionalStrings(values.map(|value| value.map(ByteArray::from)).collect())
}

pub fn dates(values: impl Iterator<Item = i32>) -> Column {
    Column::Dates(values.collect())
}

pub fn integers(values: impl Iterator<Item = u64>) -> Column {
    Column::Integers(
        values
            .map(|value| i64::try_from(value).expect("count exceeds i64"))
            .collect(),
    )
}

pub enum Table {
    UserDaily,
    CampaignDaily,
}

pub fn create_table_dir(output_dir: &Path, name: &str) -> Result<()> {
    let dir = output_dir.join(name);
    fs::create_dir_all(&dir)?;
    let _ = fs::set_permissions(&dir, Permissions::from_mode(0o777));
    for entry in fs::read_dir(&dir)?.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "parquet") && !entry.file_type().is_ok_and(|t| t.is_dir()) {
            fs::remove_file(&path).map_err(|e| format!("{}: {e}", path.display()))?;
        }
    }
    Ok(())
}

pub fn write_table(path: &Path, table: Table, columns: Vec<Column>) -> Result<()> {
    let schema = match table {
        Table::UserDaily => USER_DAILY_SCHEMA,
        Table::CampaignDaily => CAMPAIGN_DAILY_SCHEMA,
    };
    let schema = Arc::new(parse_message_type(schema)?);
    let properties = Arc::new(
        WriterProperties::builder()
            .set_writer_version(WriterVersion::PARQUET_1_0)
            .set_compression(Compression::UNCOMPRESSED)
            .set_dictionary_enabled(false)
            .set_statistics_enabled(EnabledStatistics::None)
            .build(),
    );
    let file = BufWriter::with_capacity(1 << 20, File::create(path)?);
    let mut writer = SerializedFileWriter::new(file, schema, properties)?;
    let rows = columns.first().map_or(0, column_len);
    if rows > 0 {
        let mut row_group = writer.next_row_group()?;
        for column in &columns {
            let mut column_writer = row_group.next_column()?.ok_or("schema has fewer columns than data")?;
            match column {
                Column::Strings(values) => {
                    column_writer.typed::<ByteArrayType>().write_batch(values, None, None)?;
                }
                Column::OptionalStrings(values) => {
                    let levels: Vec<i16> = values.iter().map(|value| i16::from(value.is_some())).collect();
                    let present: Vec<ByteArray> = values.iter().flatten().cloned().collect();
                    column_writer
                        .typed::<ByteArrayType>()
                        .write_batch(&present, Some(&levels), None)?;
                }
                Column::Dates(values) => {
                    column_writer.typed::<Int32Type>().write_batch(values, None, None)?;
                }
                Column::Integers(values) => {
                    column_writer.typed::<Int64Type>().write_batch(values, None, None)?;
                }
            }
            column_writer.close()?;
        }
        row_group.close()?;
    }
    writer.close()?;
    let _ = fs::set_permissions(path, Permissions::from_mode(0o666));
    Ok(())
}

fn column_len(column: &Column) -> usize {
    match column {
        Column::Strings(values) => values.len(),
        Column::OptionalStrings(values) => values.len(),
        Column::Dates(values) => values.len(),
        Column::Integers(values) => values.len(),
    }
}
