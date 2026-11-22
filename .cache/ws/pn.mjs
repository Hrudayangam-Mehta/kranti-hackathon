const real = performance.now.bind(performance)
try { performance.now = () => real() + 1e6 } catch (e) { console.log('assign failed', e.message) }
console.log('after assign', performance.now() > 1e6)
try { Object.defineProperty(performance, 'now', { value: () => real() + 2e6, configurable: true, writable: true }) } catch (e) { console.log('define failed', e.message) }
console.log('after define', performance.now() > 2e6)
const f = () => performance.now(); console.log('closure', f() > 2e6)
