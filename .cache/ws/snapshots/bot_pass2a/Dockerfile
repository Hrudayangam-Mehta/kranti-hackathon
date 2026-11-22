FROM oven/bun:1.4.4-slim@sha256:1846adf22496bd711036aae8be147e57bdebbaea2e5264e3e0b5af1db187d9a4
ENV BUN_JSC_useFTLJIT=0 \
    BUN_JSC_useConcurrentJIT=0 \
    BUN_JSC_useConcurrentGC=0 \
    BUN_JSC_numberOfGCMarkers=1 \
    BUN_JSC_numberOfBaselineCompilerThreads=1 \
    BUN_JSC_numberOfDFGCompilerThreads=1 \
    BUN_JSC_numberOfFTLCompilerThreads=1 \
    BUN_JSC_minNumberOfWorklistThreads=1 \
    BUN_JSC_maxNumberOfWorklistThreads=1
WORKDIR /bot
COPY . .
ENTRYPOINT ["bun", "/bot/bot.js"]
