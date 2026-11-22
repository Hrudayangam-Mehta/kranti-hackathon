#define _GNU_SOURCE
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <time.h>
static double now(){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1e3+t.tv_nsec*1e-6;}
int main(int argc,char**argv){
  size_t mb=atoi(argv[1]); int huge=atoi(argv[2]); size_t len=mb<<20;
  double t0=now();
  char*p=mmap(0,len,PROT_READ|PROT_WRITE,MAP_PRIVATE|MAP_ANONYMOUS|MAP_NORESERVE,-1,0);
  if(huge) madvise(p,len,MADV_HUGEPAGE);
  for(size_t i=0;i<len;i+=4096)p[i]=1;
  double t1=now();
  munmap(p,len);
  double t2=now();
  printf("%zu MB huge=%d touch %.1f ms (%.2f GB/s) munmap %.1f ms\n",mb,huge,t1-t0,mb/1024.0/((t1-t0)/1e3),t2-t1);
}
