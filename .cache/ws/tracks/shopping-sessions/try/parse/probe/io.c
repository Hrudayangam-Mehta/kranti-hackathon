#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <sys/resource.h>
#include <time.h>
#include <dirent.h>
#include <immintrin.h>
static double now(){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec+t.tv_nsec*1e-9;}
static unsigned long count_nl(const unsigned char*p,size_t n){unsigned long c=0;size_t i=0;__m256i nl=_mm256_set1_epi8('\n');
 for(;i+64<=n;i+=64){__m256i a=_mm256_loadu_si256((const void*)(p+i)),b=_mm256_loadu_si256((const void*)(p+i+32));
 c+=__builtin_popcount(_mm256_movemask_epi8(_mm256_cmpeq_epi8(a,nl)))+__builtin_popcount(_mm256_movemask_epi8(_mm256_cmpeq_epi8(b,nl)));}
 for(;i<n;i++)c+=p[i]=='\n';return c;}
int main(int argc,char**argv){int mode=atoi(argv[1]);unsigned long tot=0,bytes=0;double t0=now();
 for(int a=2;a<argc;a++){DIR*d=opendir(argv[a]);struct dirent*e;while((e=readdir(d))){if(!strstr(e->d_name,".csv"))continue;
  char path[4096];snprintf(path,sizeof path,"%s/%s",argv[a],e->d_name);int fd=open(path,O_RDONLY);struct stat st;fstat(fd,&st);size_t n=st.st_size;if(!n){close(fd);continue;}
  bytes+=n;
  if(mode<=3){int fl=MAP_PRIVATE|(mode==2?MAP_POPULATE:0);unsigned char*p=mmap(0,n,PROT_READ,fl,fd,0);
   if(mode==1)madvise(p,n,MADV_SEQUENTIAL); if(mode==3)madvise(p,n,MADV_WILLNEED);
   tot+=count_nl(p,n);}
  else if(mode==4){static unsigned char*buf=0;static size_t cap=0;if(n>cap){cap=n+64;buf=mmap(0,cap,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS,-1,0);madvise(buf,cap,MADV_HUGEPAGE);}
   size_t off=0;while(off<n){ssize_t r=read(fd,buf+off,n-off);if(r<=0)break;off+=r;} tot+=count_nl(buf,n);}
  else if(mode==5){static unsigned char buf[1<<20];ssize_t r;while((r=read(fd,buf,sizeof buf))>0)tot+=count_nl(buf,r);}
  close(fd);}closedir(d);}
 double t=now()-t0;struct rusage ru;getrusage(RUSAGE_SELF,&ru);
 printf("mode %d lines %lu bytes %lu wall %.3f user %.3f sys %.3f GB/s %.2f minflt %ld\n",mode,tot,bytes,t,ru.ru_utime.tv_sec+ru.ru_utime.tv_usec*1e-6,ru.ru_stime.tv_sec+ru.ru_stime.tv_usec*1e-6,bytes/t/1e9,ru.ru_minflt);}
