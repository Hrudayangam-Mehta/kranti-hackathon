#define _GNU_SOURCE
#include <fcntl.h>
#include <pthread.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/resource.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>

#ifndef MADV_POPULATE_READ
#define MADV_POPULATE_READ 22
#endif

static double now(void) {
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    return t.tv_sec + t.tv_nsec * 1e-9;
}

static double cpu_sys(void) {
    struct rusage r;
    getrusage(RUSAGE_SELF, &r);
    return r.ru_stime.tv_sec + r.ru_stime.tv_usec * 1e-6;
}

static double cpu_user(void) {
    struct rusage r;
    getrusage(RUSAGE_SELF, &r);
    return r.ru_utime.tv_sec + r.ru_utime.tv_usec * 1e-6;
}

static long minflt(void) {
    struct rusage r;
    getrusage(RUSAGE_SELF, &r);
    return r.ru_minflt;
}

static volatile uint64_t sink;

static uint64_t touch(const uint8_t *p, size_t n) {
    uint64_t s = 0;
    for (size_t i = 0; i < n; i += 4096) s += p[i];
    return s;
}

static uint64_t sum64(const uint8_t *p, size_t n) {
    const uint64_t *q = (const uint64_t *)p;
    uint64_t s = 0;
    for (size_t i = 0; i < n / 8; i++) s += q[i];
    return s;
}

int main(int argc, char **argv) {
    if (argc < 4) return 2;
    const char *path = argv[1];
    const char *mode = argv[2];
    size_t chunk = strtoull(argv[3], 0, 10);
    int fd = open(path, O_RDONLY);
    struct stat st;
    fstat(fd, &st);
    size_t len = st.st_size;
    double t0 = now(), s0 = cpu_sys(), u0 = cpu_user();
    long f0 = minflt();
    uint64_t acc = 0;
    double tun = 0;
    if (!strcmp(mode, "populate") || !strcmp(mode, "fault") || !strcmp(mode, "mappop") || !strcmp(mode, "popdn")) {
        int flags = MAP_PRIVATE;
        if (!strcmp(mode, "mappop")) flags |= MAP_POPULATE;
        uint8_t *p = mmap(0, len, PROT_READ, flags, fd, 0);
        for (size_t at = 0; at < len; at += chunk) {
            size_t n = len - at < chunk ? len - at : chunk;
            if (!strcmp(mode, "populate") || !strcmp(mode, "popdn")) madvise(p + at, n, MADV_POPULATE_READ);
            acc += sum64(p + at, n);
            if (!strcmp(mode, "popdn")) { double t1 = now(); madvise(p + at, n & ~4095UL, MADV_DONTNEED); tun += now() - t1; }
        }
        double t1 = now();
        munmap(p, len);
        tun += now() - t1;
    } else if (!strcmp(mode, "pread")) {
        uint8_t *buf = aligned_alloc(4096, chunk);
        memset(buf, 0, chunk);
        for (size_t at = 0; at < len; at += chunk) {
            size_t n = len - at < chunk ? len - at : chunk;
            ssize_t r = pread(fd, buf, n, at);
            if (r != (ssize_t)n) return 3;
            acc += sum64(buf, n);
        }
    } else if (!strcmp(mode, "chunkmap")) {
        for (size_t at = 0; at < len; at += chunk) {
            size_t n = len - at < chunk ? len - at : chunk;
            uint8_t *p = mmap(0, n, PROT_READ, MAP_PRIVATE | MAP_POPULATE, fd, at);
            acc += sum64(p, n);
            double t1 = now();
            munmap(p, n);
            tun += now() - t1;
        }
    }
    sink = acc;
    double t = now() - t0;
    printf("%-9s chunk %8zu  wall %.4f  sys %.4f  user %.4f  minflt %ld  unmap %.4f  GB/s %.2f\n", mode, chunk, t, cpu_sys() - s0, cpu_user() - u0, minflt() - f0, tun, len / t / 1e9);
    return 0;
}
