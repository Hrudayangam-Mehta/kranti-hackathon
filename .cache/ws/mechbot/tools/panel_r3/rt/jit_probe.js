function f(x){let s=0;for(let i=0;i<x;i++)s+=Math.sqrt(i);return s}let t=0;for(let k=0;k<2000;k++)t+=f(1000);console.log(t)
