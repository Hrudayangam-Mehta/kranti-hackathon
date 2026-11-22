#define _GNU_SOURCE
#include <pthread.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/resource.h>
#include <time.h>
#include <unistd.h>

#ifndef MADV_POPULATE_WRITE
#define MADV_POPULATE_WRITE 23
#endif

static double now(void) {
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    return t.tv_sec + t.tv_nsec * 1e-9;
}

struct arg {
    uint8_t *p;
    size_t n;
    int mode;
};

static void *work(void *a_) {
    struct arg *a = a_;
    if (a->mode == 1) {
        madvise(a->p, a->n, MADV_POPULATE_WRITE);
    } else {
        for (size_t i = 0; i < a->n; i += 4096) a->p[i] = 1;
    }
    return 0;
}

int main(int argc, char **argv) {
    size_t total = strtoull(argv[1], 0, 10) << 20;
    int huge = atoi(argv[2]);
    int threads = atoi(argv[3]);
    int mode = atoi(argv[4]);
    struct rusage r0, r1;
    getrusage(RUSAGE_SELF, &r0);
    double t0 = now();
    uint8_t *p = mmap(0, total, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS | MAP_NORESERVE, -1, 0);
    if (huge == 1) madvise(p, total, MADV_HUGEPAGE);
    if (huge == 2) madvise(p, total, MADV_NOHUGEPAGE);
    pthread_t th[64];
    struct arg args[64];
    size_t per = total / threads;
    for (int i = 0; i < threads; i++) {
        args[i] = (struct arg){p + per * i, per, mode};
        pthread_create(&th[i], 0, work, &args[i]);
    }
    for (int i = 0; i < threads; i++) pthread_join(th[i], 0);
    double t1 = now();
    munmap(p, total);
    double t2 = now();
    getrusage(RUSAGE_SELF, &r1);
    double sys = (r1.ru_stime.tv_sec - r0.ru_stime.tv_sec) + (r1.ru_stime.tv_usec - r0.ru_stime.tv_usec) * 1e-6;
    printf("MB %zu huge %d threads %d mode %d: touch wall %.4f unmap %.4f sys %.4f minflt %ld  (%.2f GB/s)\n", total >> 20, huge, threads, mode, t1 - t0, t2 - t1, sys, r1.ru_minflt - r0.ru_minflt, total / (t1 - t0) / 1e9);
    return 0;
}
