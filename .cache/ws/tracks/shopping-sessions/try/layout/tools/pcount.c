#define _GNU_SOURCE
#include <linux/perf_event.h>
#include <sys/syscall.h>
#include <sys/wait.h>
#include <sys/resource.h>
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <errno.h>
#include <time.h>
static int open_ev(pid_t pid, uint32_t type, uint64_t config) {
    struct perf_event_attr a; memset(&a, 0, sizeof a);
    a.size = sizeof a; a.type = type; a.config = config;
    a.disabled = 1; a.exclude_kernel = 1; a.exclude_hv = 1; a.inherit = 1; a.enable_on_exec = 1;
    return syscall(SYS_perf_event_open, &a, pid, -1, -1, 0);
}
int main(int argc, char **argv) {
    const char *names[] = {"instructions", "cycles", "llc-misses", "branch-misses"};
    uint64_t cfg[] = {PERF_COUNT_HW_INSTRUCTIONS, PERF_COUNT_HW_CPU_CYCLES, PERF_COUNT_HW_CACHE_MISSES, PERF_COUNT_HW_BRANCH_MISSES};
    int p[2]; if (pipe(p)) return 1;
    struct timespec t0, t1; clock_gettime(CLOCK_MONOTONIC, &t0);
    pid_t pid = fork();
    if (pid == 0) { char c; close(p[1]); if (read(p[0], &c, 1) != 1) _exit(126); execvp(argv[1], argv + 1); _exit(127); }
    int fds[4];
    for (int i = 0; i < 4; i++) { fds[i] = open_ev(pid, PERF_TYPE_HARDWARE, cfg[i]); if (fds[i] < 0) fprintf(stderr, "pcount: %s: %s\n", names[i], strerror(errno)); }
    close(p[0]); if (write(p[1], "x", 1) != 1) return 1; close(p[1]);
    int st; struct rusage ru; wait4(pid, &st, 0, &ru);
    clock_gettime(CLOCK_MONOTONIC, &t1);
    fprintf(stderr, "PCOUNT wall=%.3f user=%.3f sys=%.3f minflt=%ld rss=%ld", (t1.tv_sec - t0.tv_sec) + (t1.tv_nsec - t0.tv_nsec) / 1e9, ru.ru_utime.tv_sec + ru.ru_utime.tv_usec / 1e6, ru.ru_stime.tv_sec + ru.ru_stime.tv_usec / 1e6, ru.ru_minflt, ru.ru_maxrss);
    for (int i = 0; i < 4; i++) { uint64_t v = 0; long r = fds[i] >= 0 ? read(fds[i], &v, 8) : -2; if (r == 8) fprintf(stderr, " %s=%llu", names[i], (unsigned long long)v); else fprintf(stderr, " %s=ERR(fd=%d r=%ld e=%s)", names[i], fds[i], r, strerror(errno)); }
    fprintf(stderr, "\n");
    return WIFEXITED(st) ? WEXITSTATUS(st) : 1;
}
