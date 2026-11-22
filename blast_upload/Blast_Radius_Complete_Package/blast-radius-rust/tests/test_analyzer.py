"""Regression checks for exact patch/AST semantics, independent of sample answers."""
import difflib
import importlib.util
from pathlib import Path
import sys
import unittest

MODULE_PATH = Path(__file__).resolve().parents[1] / "tools" / "analyze_changes.py"
SPEC = importlib.util.spec_from_file_location("analyze_changes", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def diff(path, before, after, context=3):
    return (f"diff --git a/{path} b/{path}\n" + "".join(difflib.unified_diff(
        MODULE.physical_lines(before), MODULE.physical_lines(after),
        fromfile="a/" + path, tofile="b/" + path, n=context))).encode()


class AnalyzerTests(unittest.TestCase):
    path = "sqlglot/demo.py"

    def result(self, before, after, **kwargs):
        return MODULE.Analyzer({self.path: {"source": before}}).analyze(diff(self.path, before, after, **kwargs))

    def test_real_comment_is_ast_equal(self):
        result = self.result("x = 1\n", "# explanation\nx = 1\n")
        self.assertFalse(result["force_all"])
        self.assertTrue(result["files"][self.path]["ast_equal"])

    def test_multiline_string_fake_comment_is_not_equal(self):
        result = self.result('x = """hello\n# old text\nworld"""\n', 'x = """hello\n# new text\nworld"""\n')
        self.assertFalse(result["force_all"])
        self.assertFalse(result["files"][self.path]["ast_equal"])

    def test_docstring_is_preserved(self):
        result = self.result('def f():\n    """old"""\n    return 1\n', 'def f():\n    """new"""\n    return 1\n')
        self.assertFalse(result["files"][self.path]["ast_equal"])

    def test_syntax_error_flag(self):
        result = self.result("x = 1\n", "x = (\n")
        self.assertFalse(result["force_all"])
        self.assertTrue(result["files"][self.path]["syntax_error"])

    def test_compile_catches_return_outside_function(self):
        result = self.result("x = 1\n", "return 1\n")
        self.assertTrue(result["files"][self.path]["syntax_error"])

    def test_type_comments_are_preserved(self):
        result = self.result("x = 1  # type: int\n", "x = 1  # type: str\n")
        self.assertFalse(result["files"][self.path]["ast_equal"])

    def test_multiple_hunks_apply_original_coordinates(self):
        before = "".join(f"x{i} = {i}\n" for i in range(15))
        after = before.replace("x1 = 1\n", "# hello\nx1 = 2\n").replace("x13 = 13\n", "x13 = 14\n")
        patch = diff(self.path, before, after, context=1)
        parsed = MODULE.parse_patch(patch.decode())
        self.assertEqual(len(parsed[0].hunks), 2)
        self.assertEqual(MODULE.apply_exact(before, parsed[0]), after)
        self.assertFalse(MODULE.Analyzer({self.path: {"source": before}}).analyze(patch)["force_all"])

    def test_zero_count_insert_at_start(self):
        before, after = "x = 1\n", "# hi\nx = 1\n"
        parsed = MODULE.parse_patch(diff(self.path, before, after, context=0).decode())
        self.assertEqual(MODULE.apply_exact(before, parsed[0]), after)

    def test_zero_count_delete_at_start(self):
        before, after = "# hi\nx = 1\n", "x = 1\n"
        parsed = MODULE.parse_patch(diff(self.path, before, after, context=0).decode())
        self.assertEqual(MODULE.apply_exact(before, parsed[0]), after)

    def test_no_final_newline_markers(self):
        patch = "--- a/sqlglot/demo.py\n+++ b/sqlglot/demo.py\n@@ -1 +1 @@\n-x = 1\n\\ No newline at end of file\n+x = 2\n\\ No newline at end of file\n"
        parsed = MODULE.parse_patch(patch)
        self.assertEqual(MODULE.apply_exact("x = 1", parsed[0]), "x = 2")

    def test_final_newline_addition(self):
        patch = "--- a/sqlglot/demo.py\n+++ b/sqlglot/demo.py\n@@ -1 +1 @@\n-x = 1\n\\ No newline at end of file\n+x = 1\n"
        result = MODULE.Analyzer({self.path: {"source": "x = 1"}}).analyze(patch.encode())
        self.assertFalse(result["force_all"])
        self.assertTrue(result["files"][self.path]["ast_equal"])

    def test_wrong_old_content_cannot_fuzz(self):
        patch = diff(self.path, "x = 99\n", "x = 2\n")
        self.assertTrue(MODULE.Analyzer({self.path: {"source": "x = 1\n"}}).analyze(patch)["force_all"])

    def test_wrong_new_coordinates_rejected(self):
        patch = diff(self.path, "x = 1\n", "x = 2\n").replace(b"+1 @@", b"+2 @@")
        self.assertTrue(MODULE.Analyzer({self.path: {"source": "x = 1\n"}}).analyze(patch)["force_all"])

    def test_mixed_fixture_and_comment_do_not_skip_fixture(self):
        fixture = "tests/fixtures/demo.sql"
        patch = diff(self.path, "x = 1\n", "# hi\nx = 1\n") + diff(fixture, "# dialect: a\nSELECT 1;\n", "# dialect: b\nSELECT 1;\n")
        result = MODULE.Analyzer({self.path: {"source": "x = 1\n"}, fixture: {"all": [0]}}).analyze(patch)
        self.assertFalse(result["force_all"])
        self.assertTrue(result["files"][self.path]["ast_equal"])
        self.assertFalse(result["files"][fixture]["ast_equal"])

    def test_unknown_fixture_requests_fallback(self):
        patch = diff("tests/fixtures/unknown.sql", "x\n", "y\n")
        self.assertTrue(MODULE.Analyzer({}).analyze(patch)["force_all"])

    def test_independent_patches_do_not_accumulate(self):
        analyzer = MODULE.Analyzer({self.path: {"source": "x = 1\n"}})
        self.assertFalse(analyzer.analyze(diff(self.path, "x = 1\n", "x = 2\n"))["force_all"])
        self.assertTrue(analyzer.analyze(diff(self.path, "x = 2\n", "x = 3\n"))["force_all"])

    def test_header_paths_must_agree(self):
        patch = diff(self.path, "x = 1\n", "x = 2\n").replace(b"+++ b/sqlglot/demo.py", b"+++ b/sqlglot/other.py")
        self.assertTrue(MODULE.Analyzer({self.path: {"source": "x = 1\n"}}).analyze(patch)["force_all"])

    def test_path_traversal_rejected(self):
        self.assertTrue(MODULE.Analyzer({}).analyze(diff("../demo.py", "x\n", "y\n"))["force_all"])

    def test_encoding_cookie_change_is_conservative(self):
        result = self.result("# coding: utf-8\nx = 1\n", "# coding: latin-1\nx = 1\n")
        self.assertTrue(result["force_all"])

    def test_shebang_change_is_conservative(self):
        self.assertTrue(self.result("#!/usr/bin/python\nx = 1\n", "#!/usr/bin/python3\nx = 1\n")["force_all"])

    def test_unsupported_binary_and_rename(self):
        analyzer = MODULE.Analyzer({})
        self.assertTrue(analyzer.analyze(b"diff --git a/a b/a\nGIT binary patch\n")["force_all"])
        self.assertTrue(analyzer.analyze(b"diff --git a/a b/b\nsimilarity index 100%\nrename from a\nrename to b\n")["force_all"])

    def test_utf8_unicode_line_separator_stays_inside_string(self):
        before, after = 'x = "a\u2028b"\n', 'x = "a\u2028c"\n'
        parsed = MODULE.parse_patch(diff(self.path, before, after).decode())
        self.assertEqual(MODULE.apply_exact(before, parsed[0]), after)

    def test_missing_python_source_is_conservative(self):
        self.assertTrue(MODULE.Analyzer({self.path: {}}).analyze(diff(self.path, "x = 1\n", "x = 2\n"))["force_all"])


if __name__ == "__main__":
    unittest.main()
