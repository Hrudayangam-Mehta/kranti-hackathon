#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <dirent.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <sys/resource.h>
#include <time.h>
#ifndef MADV_POPULATE_READ
#define MADV_POPULATE_READ 22
#endif
static double now(){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e3+t.tv_nsec*1e-6;}
int main(int argc,char**argv){
  const char*dir=argv[1]; int mode=atoi(argv[2]); /*0 fault, 1 populate per 4MB, 2 MAP_POPULATE, 3 read() */
  DIR*d=opendir(dir); struct dirent*e; char path[4096]; unsigned long sum=0; size_t total=0;
  void* maps[1000]; size_t lens[1000]; int nm=0;
  double t0=now();
  char*buf=0; if(mode==3) buf=malloc(4<<20);
  while((e=readdir(d))){ if(e->d_name[0]=='.')continue; snprintf(path,sizeof path,"%s/%s",dir,e->d_name);
    int fd=open(path,O_RDONLY); struct stat st; fstat(fd,&st); size_t len=st.st_size; if(!len){close(fd);continue;}
    if(mode==3){ ssize_t r; while((r=read(fd,buf,4<<20))>0){ for(ssize_t i=0;i<r;i+=4096) sum+=buf[i]; total+=r;} close(fd); continue;}
    unsigned char*p=mmap(0,len,PROT_READ,MAP_PRIVATE|(mode==2?MAP_POPULATE:0),fd,0); close(fd);
    for(size_t off=0;off<len;off+=4<<20){ size_t n=len-off<(4u<<20)?len-off:(4u<<20);
      if(mode==1) madvise(p+off,n,MADV_POPULATE_READ);
      for(size_t i=0;i<n;i+=4096) sum+=p[off+i]; }
    total+=len; maps[nm]=p; lens[nm++]=len; }
  double t1=now();
  double tu=0; if(argc>3){ for(int i=0;i<nm;i++) munmap(maps[i],lens[i]); tu=now()-t1; }
  struct rusage ru; getrusage(RUSAGE_SELF,&ru);
  fprintf(stderr,"mode %d bytes %zu touch %.1f ms unmap %.1f ms user %.1f sys %.1f flt %ld (%lu)\n",mode,total,t1-t0,tu,ru.ru_utime.tv_sec*1e3+ru.ru_utime.tv_usec/1e3,ru.ru_stime.tv_sec*1e3+ru.ru_stime.tv_usec/1e3,ru.ru_minflt,sum&1);
  return 0; }
