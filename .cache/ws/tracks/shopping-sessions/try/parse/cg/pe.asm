00000000000917a0 <sessions::fast::parse_events_avx2>:
   917a0:	push   %rbp
   917a1:	push   %r15
   917a3:	push   %r14
   917a5:	push   %r13
   917a7:	push   %r12
   917a9:	push   %rbx
   917aa:	sub    $0x198,%rsp
   917b1:	mov    %rcx,%r14
   917b4:	mov    %rdi,0x118(%rsp)
   917bc:	mov    %r8,0x120(%rsp)
   917c4:	mov    %r9,0x128(%rsp)
   917cc:	movq   $0x0,0x130(%rsp)
   917d8:	cmp    $0xa0,%rdx
   917df:	mov    $0xa0,%edi
   917e4:	cmovb  %rdx,%rdi
   917e8:	mov    %rdi,%rax
   917eb:	not    %rax
   917ee:	mov    %rsi,0x108(%rsp)
   917f6:	add    %rsi,%rax
   917f9:	neg    %rdi
   917fc:	xor    %r15d,%r15d
   917ff:	nop
   91800:	mov    %rdx,%rsi
   91803:	add    %rdi,%rsi
   91806:	je     93cfb <sessions::fast::parse_events_avx2+0x255b>
   9180c:	mov    %rdi,%rcx
   9180f:	cmpb   $0xa,(%rax,%rdx,1)
   91813:	lea    -0x1(%rax),%rax
   91817:	lea    -0x1(%rdi),%rdi
   9181b:	jne    91800 <sessions::fast::parse_events_avx2+0x60>
   9181d:	lea    (%rdx,%rcx,1),%r15
   91821:	dec    %r15
   91824:	inc    %r15
   91827:	je     95f50 <sessions::fast::parse_events_avx2+0x47b0>
   9182d:	mov    0x8(%r14),%rax
   91831:	mov    %r14,%rcx
   91834:	mov    0x20(%r14),%r14
   91838:	mov    0x38(%rcx),%r12
   9183c:	mov    %rcx,0x190(%rsp)
   91844:	mov    0x50(%rcx),%r11
   91848:	add    %rdx,%rdi
   9184b:	vpxor  %xmm7,%xmm7,%xmm7
   9184f:	vpbroadcastb -0x87fd2(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   91858:	vpbroadcastb -0x87fda(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   91861:	vpbroadcastb -0x87fe2(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   9186a:	vpbroadcastb -0x87fea(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   91873:	vpbroadcastb -0x87ff2(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   9187c:	vpbroadcastb -0x87ffa(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   91885:	vpbroadcastb -0x88002(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   9188e:	mov    %rax,0x60(%rsp)
   91893:	add    $0x40,%rax
   91897:	mov    %rax,0x138(%rsp)
   9189f:	xor    %eax,%eax
   918a1:	vpbroadcastb -0x8801d(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   918aa:	vpbroadcastb -0x88025(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   918b3:	vpbroadcastb -0x8802d(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   918bc:	mov    %r14,0xe0(%rsp)
   918c4:	mov    %r12,0xb8(%rsp)
   918cc:	mov    %rdx,0xf8(%rsp)
   918d4:	mov    %r15,0xe8(%rsp)
   918dc:	mov    %rdi,0x188(%rsp)
   918e4:	mov    %r11,0x70(%rsp)
   918e9:	jmp    91931 <sessions::fast::parse_events_avx2+0x191>
   918eb:	nopl   0x0(%rax,%rax,1)
   918f0:	mov    0x80(%rsp),%rax
   918f8:	mov    %rax,0x130(%rsp)
   91900:	mov    %ebp,%eax
   91902:	mov    0xc8(%rsp),%rcx
   9190a:	add    %rax,%rcx
   9190d:	mov    %rcx,%rax
   91910:	mov    0xe8(%rsp),%r15
   91918:	mov    0xe0(%rsp),%r14
   91920:	cmp    %r15,%rax
   91923:	mov    0xf8(%rsp),%rdx
   9192b:	jae    93cf3 <sessions::fast::parse_events_avx2+0x2553>
   91931:	mov    %r15,%rdx
   91934:	sub    %rax,%rdx
   91937:	cmp    $0x8000,%rdx
   9193e:	mov    $0x8000,%r8d
   91944:	cmovb  %rdx,%r8
   91948:	mov    0x108(%rsp),%rcx
   91950:	lea    (%rcx,%rax,1),%rdi
   91954:	mov    %rdx,0x30(%rsp)
   91959:	test   %rdx,%rdx
   9195c:	mov    %rdi,0x20(%rsp)
   91961:	mov    %rax,0xc8(%rsp)
   91969:	je     91c30 <sessions::fast::parse_events_avx2+0x490>
   9196f:	mov    $0xffffffffffffffff,%rax
   91976:	shlx   %r8,%rax,%rax
   9197b:	not    %rax
   9197e:	mov    %rax,0x10(%rsp)
   91983:	xor    %r13d,%r13d
   91986:	xor    %ebp,%ebp
   91988:	xor    %r15d,%r15d
   9198b:	xor    %r9d,%r9d
   9198e:	mov    %r8,0x40(%rsp)
   91993:	jmp    919d5 <sessions::fast::parse_events_avx2+0x235>
   91995:	data16 cs nopw 0x0(%rax,%rax,1)
   919a0:	add    %rbx,%r13
   919a3:	popcnt %r11,%rax
   919a8:	add    %eax,%ebp
   919aa:	mov    0x40(%rsp),%r8
   919af:	mov    0x88(%rsp),%r9
   919b7:	cmp    %r8,%r9
   919ba:	mov    0xe0(%rsp),%r14
   919c2:	mov    0xb8(%rsp),%r12
   919ca:	mov    0x20(%rsp),%rdi
   919cf:	jae    91c10 <sessions::fast::parse_events_avx2+0x470>
   919d5:	vmovdqu (%rdi,%r9,1),%ymm0
   919db:	vmovdqu 0x20(%rdi,%r9,1),%ymm1
   919e2:	vpcmpeqb %ymm4,%ymm0,%ymm2
   919e6:	vpmovmskb %ymm2,%ecx
   919ea:	vpcmpeqb %ymm4,%ymm1,%ymm2
   919ee:	vpmovmskb %ymm2,%eax
   919f2:	shl    $0x20,%rax
   919f6:	or     %rcx,%rax
   919f9:	vpcmpeqb %ymm5,%ymm0,%ymm2
   919fd:	vpmovmskb %ymm2,%ecx
   91a01:	vpcmpeqb %ymm5,%ymm1,%ymm2
   91a05:	vpmovmskb %ymm2,%esi
   91a09:	shl    $0x20,%rsi
   91a0d:	or     %rcx,%rsi
   91a10:	vpcmpeqb %ymm6,%ymm0,%ymm0
   91a14:	vpmovmskb %ymm0,%ecx
   91a18:	vpcmpeqb %ymm6,%ymm1,%ymm0
   91a1c:	vpmovmskb %ymm0,%r11d
   91a20:	shl    $0x20,%r11
   91a24:	or     %rcx,%r11
   91a27:	lea    0x40(%r9),%rcx
   91a2b:	mov    %rcx,0x88(%rsp)
   91a33:	cmp    %r8,%rcx
   91a36:	mov    $0xffffffffffffffff,%rcx
   91a3d:	cmova  0x10(%rsp),%rcx
   91a43:	mov    %r13,%rbx
   91a46:	and    %rcx,%r11
   91a49:	and    %rcx,%rax
   91a4c:	and    %rsi,%rcx
   91a4f:	mov    0x70(%rsp),%r10
   91a54:	je     91a96 <sessions::fast::parse_events_avx2+0x2f6>
   91a56:	cs nopw 0x0(%rax,%rax,1)
   91a60:	tzcnt  %rcx,%rdx
   91a65:	bzhi   %rdx,%rax,%rsi
   91a6a:	bzhi   %rdx,%r11,%r8
   91a6f:	or     %r9d,%edx
   91a72:	mov    %edx,(%r14,%r15,4)
   91a76:	popcnt %rsi,%rdx
   91a7b:	add    %ebx,%edx
   91a7d:	mov    %edx,(%r12,%r15,4)
   91a81:	popcnt %r8,%rdx
   91a86:	add    %ebp,%edx
   91a88:	mov    %edx,(%r10,%r15,4)
   91a8c:	inc    %r15
   91a8f:	blsr   %rcx,%rcx
   91a94:	jne    91a60 <sessions::fast::parse_events_avx2+0x2c0>
   91a96:	blsr   %rax,%rsi
   91a9b:	blsr   %rsi,%r14
   91aa0:	blsr   %r14,%r13
   91aa5:	blsr   %r13,%rdi
   91aaa:	blsr   %rdi,%r8
   91aaf:	blsr   %r8,%r12
   91ab4:	blsr   %r12,%rcx
   91ab9:	tzcnt  %rcx,%rdx
   91abe:	tzcnt  %r12,%r12
   91ac3:	tzcnt  %r8,%r8
   91ac8:	tzcnt  %r13,%r13
   91acd:	tzcnt  %r14,%r14
   91ad2:	tzcnt  %rsi,%rsi
   91ad7:	tzcnt  %rax,%r10
   91adc:	vmovd  %r10d,%xmm0
   91ae1:	vpinsrd $0x1,%esi,%xmm0,%xmm0
   91ae7:	vpinsrd $0x2,%r14d,%xmm0,%xmm0
   91aed:	vpinsrd $0x3,%r13d,%xmm0,%xmm0
   91af3:	tzcnt  %rdi,%rsi
   91af8:	vmovd  %esi,%xmm1
   91afc:	vpinsrd $0x1,%r8d,%xmm1,%xmm1
   91b02:	vpinsrd $0x2,%r12d,%xmm1,%xmm1
   91b08:	vpinsrd $0x3,%edx,%xmm1,%xmm1
   91b0e:	vinserti128 $0x1,%xmm1,%ymm0,%ymm1
   91b14:	vmovd  %r9d,%xmm0
   91b19:	vpbroadcastd %xmm0,%ymm0
   91b1e:	vpaddd %ymm0,%ymm1,%ymm1
   91b22:	mov    0x60(%rsp),%rdx
   91b27:	vmovdqu %ymm1,(%rdx,%rbx,4)
   91b2c:	popcnt %rax,%r13
   91b31:	cmp    $0x9,%r13
   91b35:	jb     919a0 <sessions::fast::parse_events_avx2+0x200>
   91b3b:	blsr   %rcx,%rax
   91b40:	blsr   %rax,%rcx
   91b45:	blsr   %rcx,%rdx
   91b4a:	blsr   %rdx,%rsi
   91b4f:	blsr   %rsi,%r8
   91b54:	blsr   %r8,%r10
   91b59:	blsr   %r10,%r14
   91b5e:	blsr   %r14,%r12
   91b63:	tzcnt  %r12,%rdi
   91b68:	tzcnt  %r14,%r14
   91b6d:	tzcnt  %r10,%r10
   91b72:	tzcnt  %rsi,%rsi
   91b77:	tzcnt  %rdx,%rdx
   91b7c:	tzcnt  %rcx,%rcx
   91b81:	tzcnt  %rax,%rax
   91b86:	vmovd  %eax,%xmm1
   91b8a:	vpinsrd $0x1,%ecx,%xmm1,%xmm1
   91b90:	vpinsrd $0x2,%edx,%xmm1,%xmm1
   91b96:	vpinsrd $0x3,%esi,%xmm1,%xmm1
   91b9c:	tzcnt  %r8,%rax
   91ba1:	vmovd  %eax,%xmm2
   91ba5:	vpinsrd $0x1,%r10d,%xmm2,%xmm2
   91bab:	vpinsrd $0x2,%r14d,%xmm2,%xmm2
   91bb1:	vpinsrd $0x3,%edi,%xmm2,%xmm2
   91bb7:	vinserti128 $0x1,%xmm2,%ymm1,%ymm1
   91bbd:	vpaddd %ymm0,%ymm1,%ymm0
   91bc1:	mov    0x60(%rsp),%rax
   91bc6:	vmovdqu %ymm0,0x20(%rax,%rbx,4)
   91bcc:	blsr   %r12,%rax
   91bd1:	je     919a0 <sessions::fast::parse_events_avx2+0x200>
   91bd7:	mov    0x138(%rsp),%rcx
   91bdf:	lea    (%rcx,%rbx,4),%rcx
   91be3:	data16 data16 data16 cs nopw 0x0(%rax,%rax,1)
   91bf0:	tzcnt  %rax,%rdx
   91bf5:	or     %r9d,%edx
   91bf8:	mov    %edx,(%rcx)
   91bfa:	add    $0x4,%rcx
   91bfe:	blsr   %rax,%rax
   91c03:	jne    91bf0 <sessions::fast::parse_events_avx2+0x450>
   91c05:	jmp    919a0 <sessions::fast::parse_events_avx2+0x200>
   91c0a:	nopw   0x0(%rax,%rax,1)
   91c10:	mov    0xe8(%rsp),%rcx
   91c18:	mov    0xc8(%rsp),%rax
   91c20:	add    %r8,%rax
   91c23:	cmp    %rcx,%rax
   91c26:	je     91c43 <sessions::fast::parse_events_avx2+0x4a3>
   91c28:	jmp    91c4f <sessions::fast::parse_events_avx2+0x4af>
   91c2a:	nopw   0x0(%rax,%rax,1)
   91c30:	mov    %r15,%rcx
   91c33:	xor    %r15d,%r15d
   91c36:	xor    %ebp,%ebp
   91c38:	xor    %r13d,%r13d
   91c3b:	add    %r8,%rax
   91c3e:	cmp    %rcx,%rax
   91c41:	jne    91c4f <sessions::fast::parse_events_avx2+0x4af>
   91c43:	cmpb   $0xa,-0x1(%rdi,%r8,1)
   91c49:	jne    93c10 <sessions::fast::parse_events_avx2+0x2470>
   91c4f:	mov    0x70(%rsp),%r11
   91c54:	test   %r15,%r15
   91c57:	je     93c2d <sessions::fast::parse_events_avx2+0x248d>
   91c5d:	mov    0x130(%rsp),%rax
   91c65:	mov    %rax,0x80(%rsp)
   91c6d:	mov    0x118(%rsp),%rax
   91c75:	mov    %rax,(%rsp)
   91c79:	mov    0x120(%rsp),%rax
   91c81:	mov    %rax,0x140(%rsp)
   91c89:	mov    0x128(%rsp),%rax
   91c91:	mov    %rax,0x8(%rsp)
   91c96:	xor    %ebp,%ebp
   91c98:	xor    %r8d,%r8d
   91c9b:	xor    %esi,%esi
   91c9d:	xor    %r10d,%r10d
   91ca0:	jmp    91cbe <sessions::fast::parse_events_avx2+0x51e>
   91ca2:	mov    0x4c(%rsp),%esi
   91ca6:	cs nopw 0x0(%rax,%rax,1)
   91cb0:	inc    %r8
   91cb3:	inc    %ebp
   91cb5:	cmp    %r15,%r8
   91cb8:	je     918f0 <sessions::fast::parse_events_avx2+0x150>
   91cbe:	mov    %r10d,%edi
   91cc1:	mov    %esi,%eax
   91cc3:	mov    %ebp,%r14d
   91cc6:	mov    0xe0(%rsp),%rcx
   91cce:	mov    (%rcx,%r8,4),%ebp
   91cd2:	mov    (%r12,%r8,4),%esi
   91cd6:	mov    (%r11,%r8,4),%r10d
   91cda:	cmp    %r14d,%ebp
   91cdd:	jbe    91cb0 <sessions::fast::parse_events_avx2+0x510>
   91cdf:	mov    %esi,%ecx
   91ce1:	sub    %eax,%ecx
   91ce3:	cmp    $0x6,%ecx
   91ce6:	jne    91cb0 <sessions::fast::parse_events_avx2+0x510>
   91ce8:	mov    %r12,%rbx
   91ceb:	mov    %esi,0x4c(%rsp)
   91cef:	mov    %eax,%eax
   91cf1:	mov    %r10d,0x88(%rsp)
   91cf9:	mov    0x60(%rsp),%r10
   91cfe:	vmovdqu (%r10,%rax,4),%xmm8
   91d04:	mov    0xc(%r10,%rax,4),%ecx
   91d09:	mov    0x8(%r10,%rax,4),%esi
   91d0e:	mov    (%r10,%rax,4),%r11d
   91d12:	mov    0x4(%r10,%rax,4),%r9d
   91d17:	lea    0x1(%r11),%edx
   91d1b:	mov    %edx,0x10(%rsp)
   91d1f:	lea    0x1(%r9),%r13d
   91d23:	lea    0x1(%rsi),%edx
   91d26:	mov    %edx,0x30(%rsp)
   91d2a:	lea    0x1(%rcx),%edx
   91d2d:	mov    %edx,0x58(%rsp)
   91d31:	mov    0x10(%r10,%rax,4),%edx
   91d36:	lea    0x1(%rdx),%r12d
   91d3a:	mov    %r12d,0x6c(%rsp)
   91d3f:	mov    0x14(%r10,%rax,4),%eax
   91d44:	mov    0x88(%rsp),%r10d
   91d4c:	lea    0x1(%rax),%r12d
   91d50:	mov    %r12d,0x40(%rsp)
   91d55:	mov    %r10d,%r12d
   91d58:	sub    %edi,%r12d
   91d5b:	jne    91da0 <sessions::fast::parse_events_avx2+0x600>
   91d5d:	mov    %r13d,0x28(%rsp)
   91d62:	mov    %rdx,0xc0(%rsp)
   91d6a:	mov    %rax,0x90(%rsp)
   91d72:	mov    %ebp,%esi
   91d74:	mov    0x40(%rsp),%ecx
   91d78:	mov    0x10(%rsp),%edx
   91d7c:	mov    %rbx,%r12
   91d7f:	mov    0x70(%rsp),%r11
   91d84:	vmovd  %xmm8,%eax
   91d88:	sub    %r14d,%eax
   91d8b:	je     91ca2 <sessions::fast::parse_events_avx2+0x502>
   91d91:	jmp    91fc8 <sessions::fast::parse_events_avx2+0x828>
   91d96:	cs nopw 0x0(%rax,%rax,1)
   91da0:	mov    %r8,0x98(%rsp)
   91da8:	mov    %r14d,%r10d
   91dab:	mov    %r11d,%edi
   91dae:	cmp    $0x1,%r11d
   91db2:	adc    $0xffffffffffffffff,%rdi
   91db6:	mov    %r14d,0x28(%rsp)
   91dbb:	vpinsrd $0x3,%r14d,%xmm8,%xmm0
   91dc1:	vpshufd $0x93,%xmm0,%xmm0
   91dc6:	mov    0x10(%rsp),%r11d
   91dcb:	mov    %r9d,%ebx
   91dce:	cmp    $0x1,%r9d
   91dd2:	adc    $0xffffffffffffffff,%rbx
   91dd6:	mov    %r13d,%r9d
   91dd9:	mov    %rbp,%r8
   91ddc:	mov    %esi,%ebp
   91dde:	cmp    $0x1,%esi
   91de1:	adc    $0xffffffffffffffff,%rbp
   91de5:	mov    0x30(%rsp),%esi
   91de9:	mov    %ecx,%r14d
   91dec:	cmp    $0x1,%ecx
   91def:	adc    $0xffffffffffffffff,%r14
   91df3:	mov    %r12d,0x90(%rsp)
   91dfb:	mov    0x20(%rsp),%r12
   91e00:	movzbl (%r12,%r10,1),%r10d
   91e05:	vmovd  %r10d,%xmm1
   91e0a:	vpinsrb $0x1,(%r12,%r11,1),%xmm1,%xmm1
   91e11:	vpinsrb $0x2,(%r12,%r9,1),%xmm1,%xmm1
   91e18:	vpinsrb $0x3,(%r12,%rsi,1),%xmm1,%xmm1
   91e1f:	vpaddd -0x89337(%rip),%xmm0,%xmm0        # 8af0 <__abi_tag+0x87f4>
   91e27:	vmovdqa -0x89e5f(%rip),%xmm3        # 7fd0 <__abi_tag+0x7cd4>
   91e2f:	vpcmpeqb %xmm3,%xmm1,%xmm1
   91e33:	movzbl (%r12,%rdi,1),%esi
   91e38:	vmovd  %esi,%xmm2
   91e3c:	vpinsrb $0x1,(%r12,%rbx,1),%xmm2,%xmm2
   91e43:	vpinsrb $0x2,(%r12,%rbp,1),%xmm2,%xmm2
   91e4a:	vpinsrb $0x3,(%r12,%r14,1),%xmm2,%xmm2
   91e51:	vpcmpeqb %xmm3,%xmm2,%xmm2
   91e55:	vpand  %xmm2,%xmm1,%xmm1
   91e59:	vpmaxud %xmm0,%xmm8,%xmm0
   91e5e:	vpcmpeqd %xmm0,%xmm8,%xmm0
   91e62:	vpmovsxbd %xmm1,%xmm1
   91e67:	vpand  %xmm0,%xmm1,%xmm0
   91e6b:	vpsrld $0x1f,%xmm0,%xmm1
   91e70:	vmovd  %xmm1,%r9d
   91e75:	vpextrd $0x1,%xmm1,%edi
   91e7b:	vpextrd $0x2,%xmm1,%r11d
   91e81:	vpextrd $0x3,%xmm1,%r10d
   91e87:	lea    (%r11,%r10,1),%ebx
   91e8b:	add    %r9d,%ebx
   91e8e:	add    %edi,%ebx
   91e90:	mov    0x58(%rsp),%esi
   91e94:	movzbl (%r12,%rsi,1),%esi
   91e99:	xor    $0x22,%sil
   91e9d:	cmp    $0x1,%rdx
   91ea1:	mov    %rdx,%r14
   91ea4:	adc    $0xffffffffffffffff,%r14
   91ea8:	movzbl (%r12,%r14,1),%ebp
   91ead:	xor    $0x22,%bpl
   91eb1:	add    $0x3,%ecx
   91eb4:	cmp    %ecx,%edx
   91eb6:	setae  %cl
   91eb9:	or     %sil,%bpl
   91ebc:	sete   %sil
   91ec0:	and    %cl,%sil
   91ec3:	movzbl %sil,%ecx
   91ec7:	mov    0x6c(%rsp),%esi
   91ecb:	movzbl (%r12,%rsi,1),%esi
   91ed0:	xor    $0x22,%sil
   91ed4:	cmp    $0x1,%rax
   91ed8:	mov    %rax,%r14
   91edb:	adc    $0xffffffffffffffff,%r14
   91edf:	movzbl (%r12,%r14,1),%ebp
   91ee4:	xor    $0x22,%bpl
   91ee8:	lea    0x3(%rdx),%r14d
   91eec:	cmp    %r14d,%eax
   91eef:	setae  %r14b
   91ef3:	or     %sil,%bpl
   91ef6:	sete   %sil
   91efa:	and    %r14b,%sil
   91efd:	movzbl %sil,%esi
   91f01:	mov    0x40(%rsp),%r14d
   91f06:	movzbl (%r12,%r14,1),%ebp
   91f0b:	xor    $0x22,%bpl
   91f0f:	movzbl -0x1(%r12,%r8,1),%r14d
   91f15:	xor    $0x22,%r14b
   91f19:	mov    %r13d,%r12d
   91f1c:	lea    0x3(%rax),%r13d
   91f20:	cmp    %r13d,%r8d
   91f23:	setae  %r13b
   91f27:	or     %bpl,%r14b
   91f2a:	lea    (%rcx,%rsi,1),%r14d
   91f2e:	sete   %bpl
   91f32:	and    %r13b,%bpl
   91f35:	movzbl %bpl,%ebp
   91f39:	add    %ebp,%r14d
   91f3c:	add    %ebx,%r14d
   91f3f:	add    %r14d,%r14d
   91f42:	cmp    0x90(%rsp),%r14d
   91f4a:	jne    922f5 <sessions::fast::parse_events_avx2+0xb55>
   91f50:	mov    0x28(%rsp),%r14d
   91f55:	add    %r9d,%r14d
   91f58:	mov    0x10(%rsp),%r9d
   91f5d:	add    %edi,%r9d
   91f60:	add    %r11d,%r12d
   91f63:	mov    %r12d,0x28(%rsp)
   91f68:	add    %r10d,0x30(%rsp)
   91f6d:	add    %ecx,0x58(%rsp)
   91f71:	sub    %ecx,%edx
   91f73:	mov    %rdx,0xc0(%rsp)
   91f7b:	add    %esi,0x6c(%rsp)
   91f7f:	sub    %esi,%eax
   91f81:	mov    %rax,0x90(%rsp)
   91f89:	mov    0x40(%rsp),%ecx
   91f8d:	add    %ebp,%ecx
   91f8f:	mov    %r8d,%esi
   91f92:	sub    %ebp,%esi
   91f94:	vpaddd %xmm0,%xmm8,%xmm8
   91f98:	mov    0xb8(%rsp),%r12
   91fa0:	mov    0x70(%rsp),%r11
   91fa5:	mov    %r8,%rbp
   91fa8:	mov    0x98(%rsp),%r8
   91fb0:	mov    0x88(%rsp),%r10d
   91fb8:	mov    %r9d,%edx
   91fbb:	vmovd  %xmm8,%eax
   91fbf:	sub    %r14d,%eax
   91fc2:	je     91ca2 <sessions::fast::parse_events_avx2+0x502>
   91fc8:	mov    %rsi,%r13
   91fcb:	mov    %ecx,0x40(%rsp)
   91fcf:	mov    %edx,%esi
   91fd1:	mov    %r14d,%edi
   91fd4:	vmovdqa %xmm8,0x10(%rsp)
   91fda:	vpextrd $0x1,%xmm8,%ecx
   91fe0:	mov    %ecx,0x110(%rsp)
   91fe7:	mov    %ecx,%r9d
   91fea:	sub    %edx,%r9d
   91fed:	cmp    $0xb,%rax
   91ff1:	mov    $0xb,%ecx
   91ff6:	cmovb  %rax,%rcx
   91ffa:	cmp    $0xb,%r9
   91ffe:	mov    $0xb,%edx
   92003:	cmovb  %r9,%rdx
   92007:	mov    %esi,%r10d
   9200a:	mov    0x20(%rsp),%rsi
   9200f:	vmovdqu (%rsi,%rdi,1),%xmm0
   92014:	vinserti128 $0x1,(%rsi,%r10,1),%ymm0,%ymm0
   9201b:	vmovd  %ecx,%xmm1
   9201f:	vmovd  %edx,%xmm2
   92023:	vinserti128 $0x1,%xmm2,%ymm1,%ymm1
   92029:	vpaddb %ymm0,%ymm9,%ymm2
   9202d:	vpminub %ymm2,%ymm10,%ymm3
   92031:	vpcmpeqb %ymm3,%ymm2,%ymm2
   92035:	vpaddb %ymm0,%ymm11,%ymm3
   92039:	vpminub %ymm3,%ymm12,%ymm4
   9203d:	vpcmpeqb %ymm4,%ymm3,%ymm3
   92041:	vpaddb %ymm0,%ymm13,%ymm4
   92045:	vpminub %ymm4,%ymm12,%ymm5
   92049:	vpcmpeqb %ymm5,%ymm4,%ymm4
   9204d:	vpaddb %ymm0,%ymm15,%ymm5
   92051:	vpand  %ymm5,%ymm2,%ymm5
   92055:	vpaddb -0x8895d(%rip),%ymm0,%ymm6        # 9700 <__abi_tag+0x9404>
   9205d:	vpand  %ymm6,%ymm3,%ymm6
   92061:	vpor   %ymm6,%ymm5,%ymm5
   92065:	vpor   %ymm2,%ymm3,%ymm2
   92069:	vpcmpeqb %ymm0,%ymm14,%ymm3
   9206d:	vpaddb -0x88915(%rip),%ymm0,%ymm0        # 9760 <__abi_tag+0x9464>
   92075:	vpand  %ymm0,%ymm4,%ymm0
   92079:	vpor   %ymm4,%ymm3,%ymm4
   9207d:	vpor   %ymm2,%ymm4,%ymm2
   92081:	vpshufb %ymm7,%ymm1,%ymm1
   92086:	vpcmpgtb -0x88a0e(%rip),%ymm1,%ymm1        # 9680 <__abi_tag+0x9384>
   9208e:	vpandn %ymm1,%ymm2,%ymm2
   92092:	vpsllw $0x7,%ymm2,%ymm2
   92097:	vpmovmskb %ymm2,%ecx
   9209b:	vpand  -0x88963(%rip),%ymm3,%ymm2        # 9740 <__abi_tag+0x9444>
   920a3:	vpor   %ymm2,%ymm0,%ymm0
   920a7:	vpor   %ymm5,%ymm0,%ymm0
   920ab:	vpand  %ymm0,%ymm1,%ymm0
   920af:	vpmaddubsw -0x888b8(%rip),%ymm0,%ymm0        # 9800 <__abi_tag+0x9504>
   920b8:	vpmaddwd -0x88880(%rip),%ymm0,%ymm0        # 9840 <__abi_tag+0x9544>
   920c0:	cmp    $0xb,%r9d
   920c4:	setb   %sil
   920c8:	cmp    $0x10000,%ecx
   920ce:	setb   0xf0(%rsp)
   920d6:	cmp    $0xa,%eax
   920d9:	mov    %sil,0xd0(%rsp)
   920e1:	ja     9341a <sessions::fast::parse_events_avx2+0x1c7a>
   920e7:	movzwl %cx,%ecx
   920ea:	test   %ecx,%ecx
   920ec:	jne    9341a <sessions::fast::parse_events_avx2+0x1c7a>
   920f2:	vpextrd $0x1,%xmm0,%eax
   920f8:	vmovd  %xmm0,%ecx
   920fc:	vpextrd $0x2,%xmm0,%r11d
   92102:	shl    $0x24,%rcx
   92106:	shl    $0xc,%rax
   9210a:	or     %rcx,%rax
   9210d:	shr    $0xc,%r11d
   92111:	or     %rax,%r11
   92114:	mov    0x30(%rsp),%ecx
   92118:	mov    %ecx,%ebx
   9211a:	vmovdqa 0x10(%rsp),%xmm1
   92120:	vpextrd $0x3,%xmm1,%eax
   92126:	add    0x20(%rsp),%rbx
   9212b:	mov    %eax,%edx
   9212d:	sub    %ecx,%edx
   9212f:	cmp    $0x19,%rdx
   92133:	vpbroadcastb -0x888af(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   9213c:	vpbroadcastb -0x888b7(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   92145:	vpbroadcastb -0x888bf(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   9214e:	mov    %rbp,0xd8(%rsp)
   92156:	mov    %r8,0x98(%rsp)
   9215e:	mov    %r13,0x100(%rsp)
   92166:	je     9230a <sessions::fast::parse_events_avx2+0xb6a>
   9216c:	cmp    $0x14,%edx
   9216f:	jne    92554 <sessions::fast::parse_events_avx2+0xdb4>
   92175:	cmpb   $0x5a,0x13(%rbx)
   92179:	jne    9265f <sessions::fast::parse_events_avx2+0xebf>
   9217f:	mov    %r10,0x50(%rsp)
   92184:	mov    %r9,0x78(%rsp)
   92189:	mov    (%rsp),%rsi
   9218d:	mov    %r11,%r13
   92190:	mov    (%rbx),%rdx
   92193:	mov    0x8e0(%rsi),%rax
   9219a:	imul   %rdx,%rax
   9219e:	shr    $0x3c,%rax
   921a2:	cmp    %rdx,0x698(%rsi,%rax,8)
   921aa:	jne    93620 <sessions::fast::parse_events_avx2+0x1e80>
   921b0:	mov    0x718(%rsi,%rax,8),%r14
   921b8:	mov    0x798(%rsi,%rax,8),%rdx
   921c0:	movzwl 0x8(%rbx),%edi
   921c4:	xor    $0x3030,%rdi
   921cb:	mov    0xb(%rbx),%rsi
   921cf:	mov    %rsi,%rax
   921d2:	movabs $0x3030303030303030,%r8
   921dc:	xor    %r8,%rax
   921df:	lea    0x7676(%rdi),%r8d
   921e6:	or     %edi,%r8d
   921e9:	and    $0x8080,%r8d
   921f0:	movabs $0x7676767676767676,%r9
   921fa:	add    %rax,%r9
   921fd:	or     %rsi,%r9
   92200:	movabs $0x8080008080008080,%r10
   9220a:	and    %r10,%r9
   9220d:	xor    %r10d,%r10d
   92210:	cmpb   $0x54,0xa(%rbx)
   92214:	setne  %r10b
   92218:	movabs $0xff0000ff0000,%r11
   92222:	and    %r11,%rsi
   92225:	or     %r10,%rsi
   92228:	or     %r9,%rsi
   9222b:	or     %r8,%rsi
   9222e:	movabs $0x3a00003a0000,%r8
   92238:	cmp    %r8,%rsi
   9223b:	jne    92630 <sessions::fast::parse_events_avx2+0xe90>
   92241:	lea    (%rax,%rax,4),%rsi
   92245:	shr    $0x8,%rax
   92249:	lea    (%rax,%rsi,2),%r9
   9224d:	mov    %r9,%rax
   92250:	shr    $0x30,%rax
   92254:	movzbl %al,%esi
   92257:	xor    %eax,%eax
   92259:	cmp    $0x3b,%rsi
   9225d:	mov    0x8(%rsp),%rbx
   92262:	mov    %r13,%r11
   92265:	ja     928d3 <sessions::fast::parse_events_avx2+0x1133>
   9226b:	mov    %r9d,%r8d
   9226e:	shr    $0x18,%r8d
   92272:	cmp    $0x3b,%r8d
   92276:	mov    (%rsp),%rbp
   9227a:	mov    $0xffffffff,%r13d
   92280:	ja     928e5 <sessions::fast::parse_events_avx2+0x1145>
   92286:	movzbl %r9b,%ecx
   9228a:	cmp    $0x17,%ecx
   9228d:	ja     928e5 <sessions::fast::parse_events_avx2+0x1145>
   92293:	movzbl %dil,%r10d
   92297:	lea    (%r10,%r10,4),%r10
   9229b:	shr    $0x8,%edi
   9229e:	lea    (%rdi,%r10,2),%rdi
   922a2:	test   %rdi,%rdi
   922a5:	je     928e5 <sessions::fast::parse_events_avx2+0x1145>
   922ab:	movabs $0x7fffffffffffffff,%r10
   922b5:	mov    $0x0,%r9d
   922bb:	cmp    %rdx,%rdi
   922be:	jg     927d1 <sessions::fast::parse_events_avx2+0x1031>
   922c4:	add    %r14,%rdi
   922c7:	imul   $0x15180,%rdi,%rax
   922ce:	imul   $0xe10,%rcx,%rcx
   922d5:	imul   $0x3c,%r8,%rdx
   922d9:	add    %rsi,%rcx
   922dc:	add    %rdx,%rcx
   922df:	add    %rax,%rcx
   922e2:	imul   $0x3e8,%rcx,%r8
   922e9:	add    $0xfffffffffad9a400,%r8
   922f0:	jmp    92974 <sessions::fast::parse_events_avx2+0x11d4>
   922f5:	mov    0xb8(%rsp),%r12
   922fd:	mov    0x70(%rsp),%r11
   92302:	mov    %r8,%rbp
   92305:	jmp    928ba <sessions::fast::parse_events_avx2+0x111a>
   9230a:	movzbl 0x13(%rbx),%r14d
   9230f:	cmp    $0x2b,%r14d
   92313:	je     9231f <sessions::fast::parse_events_avx2+0xb7f>
   92315:	cmp    $0x2d,%r14d
   92319:	jne    9265f <sessions::fast::parse_events_avx2+0xebf>
   9231f:	mov    %r10,0x50(%rsp)
   92324:	mov    %r9,0x78(%rsp)
   92329:	mov    (%rsp),%rcx
   9232d:	mov    %r11,%r13
   92330:	mov    (%rbx),%rdx
   92333:	mov    0x8e0(%rcx),%rax
   9233a:	imul   %rdx,%rax
   9233e:	shr    $0x3c,%rax
   92342:	cmp    %rdx,0x698(%rcx,%rax,8)
   9234a:	jne    93570 <sessions::fast::parse_events_avx2+0x1dd0>
   92350:	mov    0x718(%rcx,%rax,8),%rdx
   92358:	mov    0x798(%rcx,%rax,8),%r8
   92360:	movzwl 0x8(%rbx),%r10d
   92365:	xor    $0x3030,%r10
   9236c:	mov    0xb(%rbx),%rcx
   92370:	mov    %rcx,%rax
   92373:	movabs $0x3030303030303030,%rsi
   9237d:	xor    %rsi,%rax
   92380:	lea    0x7676(%r10),%esi
   92387:	or     %r10d,%esi
   9238a:	and    $0x8080,%esi
   92390:	movabs $0x7676767676767676,%rdi
   9239a:	add    %rax,%rdi
   9239d:	or     %rcx,%rdi
   923a0:	movabs $0x8080008080008080,%r9
   923aa:	and    %r9,%rdi
   923ad:	xor    %r9d,%r9d
   923b0:	cmpb   $0x54,0xa(%rbx)
   923b4:	setne  %r9b
   923b8:	movabs $0xff0000ff0000,%r11
   923c2:	and    %r11,%rcx
   923c5:	or     %r9,%rcx
   923c8:	or     %rdi,%rcx
   923cb:	or     %rsi,%rcx
   923ce:	movabs $0x3a00003a0000,%rsi
   923d8:	cmp    %rsi,%rcx
   923db:	jne    92630 <sessions::fast::parse_events_avx2+0xe90>
   923e1:	lea    (%rax,%rax,4),%rcx
   923e5:	shr    $0x8,%rax
   923e9:	lea    (%rax,%rcx,2),%rsi
   923ed:	mov    %rsi,%rax
   923f0:	shr    $0x30,%rax
   923f4:	movzbl %al,%ecx
   923f7:	xor    %eax,%eax
   923f9:	cmp    $0x3b,%rcx
   923fd:	mov    %r13,%r11
   92400:	ja     927b5 <sessions::fast::parse_events_avx2+0x1015>
   92406:	mov    %esi,%edi
   92408:	shr    $0x18,%edi
   9240b:	cmp    $0x3b,%edi
   9240e:	ja     927b5 <sessions::fast::parse_events_avx2+0x1015>
   92414:	movzbl %sil,%r9d
   92418:	cmp    $0x17,%r9d
   9241c:	ja     927b5 <sessions::fast::parse_events_avx2+0x1015>
   92422:	mov    %rdx,0x10(%rsp)
   92427:	movzbl %r10b,%esi
   9242b:	lea    (%rsi,%rsi,4),%rsi
   9242f:	shr    $0x8,%r10d
   92433:	lea    (%r10,%rsi,2),%rdx
   92437:	test   %rdx,%rdx
   9243a:	je     927b5 <sessions::fast::parse_events_avx2+0x1015>
   92440:	cmp    %r8,%rdx
   92443:	jg     927b5 <sessions::fast::parse_events_avx2+0x1015>
   92449:	cmpb   $0x3a,0x16(%rbx)
   9244d:	jne    927b3 <sessions::fast::parse_events_avx2+0x1013>
   92453:	movzbl 0x14(%rbx),%esi
   92457:	add    $0xd0,%sil
   9245b:	xor    %eax,%eax
   9245d:	cmp    $0x9,%sil
   92461:	ja     927b5 <sessions::fast::parse_events_avx2+0x1015>
   92467:	movzbl 0x15(%rbx),%r8d
   9246c:	add    $0xd0,%r8b
   92470:	cmp    $0x9,%r8b
   92474:	ja     927b5 <sessions::fast::parse_events_avx2+0x1015>
   9247a:	movzbl 0x17(%rbx),%ebp
   9247e:	add    $0xd0,%bpl
   92482:	cmp    $0x9,%bpl
   92486:	ja     927b5 <sessions::fast::parse_events_avx2+0x1015>
   9248c:	movzbl 0x18(%rbx),%r11d
   92491:	add    $0xd0,%r11b
   92495:	cmp    $0x9,%r11b
   92499:	ja     92632 <sessions::fast::parse_events_avx2+0xe92>
   9249f:	movzbl %sil,%eax
   924a3:	add    %eax,%eax
   924a5:	lea    (%rax,%rax,4),%esi
   924a8:	add    %r8b,%sil
   924ab:	xor    %eax,%eax
   924ad:	cmp    $0x17,%sil
   924b1:	mov    0x8(%rsp),%rbx
   924b6:	ja     93111 <sessions::fast::parse_events_avx2+0x1971>
   924bc:	mov    %r9,0x30(%rsp)
   924c1:	movzbl %bpl,%r8d
   924c5:	add    %r8d,%r8d
   924c8:	lea    (%r8,%r8,4),%r8d
   924cc:	add    %r11b,%r8b
   924cf:	movabs $0x7fffffffffffffff,%r10
   924d9:	mov    $0x0,%r9d
   924df:	cmp    $0x3b,%r8b
   924e3:	mov    %r13,%r11
   924e6:	mov    (%rsp),%rbp
   924ea:	mov    $0xffffffff,%r13d
   924f0:	ja     927d1 <sessions::fast::parse_events_avx2+0x1031>
   924f6:	add    0x10(%rsp),%rdx
   924fb:	imul   $0x15180,%rdx,%rax
   92502:	imul   $0xe10,0x30(%rsp),%rdx
   9250b:	imul   $0x3c,%rdi,%rdi
   9250f:	add    %rcx,%rdx
   92512:	add    %rdi,%rdx
   92515:	add    %rax,%rdx
   92518:	imul   $0x3e8,%rdx,%rax
   9251f:	add    $0xfffffffffad9a400,%rax
   92525:	movzbl %r8b,%ecx
   92529:	movzbl %sil,%edx
   9252d:	imul   $0x36ee80,%rdx,%rdx
   92534:	imul   $0xea60,%rcx,%rcx
   9253b:	add    %rdx,%rcx
   9253e:	mov    %rcx,%r8
   92541:	neg    %r8
   92544:	cmp    $0x2b,%r14b
   92548:	cmovne %rcx,%r8
   9254c:	add    %rax,%r8
   9254f:	jmp    92974 <sessions::fast::parse_events_avx2+0x11d4>
   92554:	lea    -0x1(%rdx),%ecx
   92557:	cmp    $0x10,%ecx
   9255a:	jae    9264c <sessions::fast::parse_events_avx2+0xeac>
   92560:	mov    %r10,0x50(%rsp)
   92565:	mov    %r9,0x78(%rsp)
   9256a:	cmp    $0x9,%edx
   9256d:	jae    92708 <sessions::fast::parse_events_avx2+0xf68>
   92573:	lea    0x0(,%rdx,8),%ecx
   9257a:	xor    %eax,%eax
   9257c:	cmp    $0x8,%rdx
   92580:	movabs $0x3030303030303030,%rsi
   9258a:	shrx   %rcx,%rsi,%rcx
   9258f:	cmove  %rax,%rcx
   92593:	neg    %dl
   92595:	shl    $0x3,%dl
   92598:	shlx   %rdx,(%rbx),%rdx
   9259d:	or     %rdx,%rcx
   925a0:	xor    %rsi,%rcx
   925a3:	movabs $0x7676767676767676,%rsi
   925ad:	add    %rcx,%rsi
   925b0:	or     %rdx,%rsi
   925b3:	mov    $0xffffffff,%r13d
   925b9:	movabs $0x7fffffffffffffff,%r10
   925c3:	mov    $0x0,%r9d
   925c9:	movabs $0x8080808080808080,%rdx
   925d3:	test   %rdx,%rsi
   925d6:	mov    0x8(%rsp),%rbx
   925db:	mov    (%rsp),%rbp
   925df:	jne    927d1 <sessions::fast::parse_events_avx2+0x1031>
   925e5:	lea    (%rcx,%rcx,4),%rax
   925e9:	shr    $0x8,%rcx
   925ed:	lea    (%rcx,%rax,2),%r8
   925f1:	mov    %r8,%rax
   925f4:	movabs $0xff000000ff,%rdx
   925fe:	and    %rdx,%rax
   92601:	movabs $0xf424000000064,%rcx
   9260b:	imul   %rcx,%rax
   9260f:	shr    $0x10,%r8
   92613:	and    %rdx,%r8
   92616:	movabs $0x271000000001,%rcx
   92620:	imul   %rcx,%r8
   92624:	add    %rax,%r8
   92627:	shr    $0x20,%r8
   9262b:	jmp    92974 <sessions::fast::parse_events_avx2+0x11d4>
   92630:	xor    %eax,%eax
   92632:	movabs $0x7fffffffffffffff,%r10
   9263c:	xor    %r9d,%r9d
   9263f:	mov    0x8(%rsp),%rbx
   92644:	mov    %r13,%r11
   92647:	jmp    927c7 <sessions::fast::parse_events_avx2+0x1027>
   9264c:	cmp    0x30(%rsp),%eax
   92650:	jne    9265f <sessions::fast::parse_events_avx2+0xebf>
   92652:	xor    %eax,%eax
   92654:	mov    $0xffffffff,%r13d
   9265a:	jmp    92767 <sessions::fast::parse_events_avx2+0xfc7>
   9265f:	xor    %ecx,%ecx
   92661:	xor    %eax,%eax
   92663:	xor    %esi,%esi
   92665:	xor    %r8d,%r8d
   92668:	nopl   0x0(%rax,%rax,1)
   92670:	movzbl (%rbx,%rcx,1),%edi
   92674:	add    $0xd0,%dil
   92678:	mov    $0xffffffff,%r13d
   9267e:	cmp    $0x9,%dil
   92682:	ja     926eb <sessions::fast::parse_events_avx2+0xf4b>
   92684:	test   %dil,%dil
   92687:	mov    %r8,%r13
   9268a:	setne  %r8b
   9268e:	or     %r8b,%sil
   92691:	movzbl %sil,%r8d
   92695:	and    $0x1,%r8d
   92699:	add    %r8d,%eax
   9269c:	lea    0x0(,%r13,4),%r8
   926a4:	add    %r13,%r8
   926a7:	movzbl %dil,%edi
   926ab:	lea    (%rdi,%r8,2),%r8
   926af:	inc    %rcx
   926b2:	cmp    %rcx,%rdx
   926b5:	jne    92670 <sessions::fast::parse_events_avx2+0xed0>
   926b7:	cmp    $0x14,%eax
   926ba:	setb   %al
   926bd:	test   %r8,%r8
   926c0:	setns  %cl
   926c3:	and    %al,%cl
   926c5:	cmp    $0x1,%cl
   926c8:	mov    0x8(%rsp),%rbx
   926cd:	mov    (%rsp),%rbp
   926d1:	je     9297e <sessions::fast::parse_events_avx2+0x11de>
   926d7:	xor    %eax,%eax
   926d9:	movabs $0x7fffffffffffffff,%r10
   926e3:	xor    %r9d,%r9d
   926e6:	jmp    927cb <sessions::fast::parse_events_avx2+0x102b>
   926eb:	xor    %eax,%eax
   926ed:	movabs $0x7fffffffffffffff,%r10
   926f7:	mov    0x8(%rsp),%rbx
   926fc:	mov    (%rsp),%rbp
   92700:	xor    %r9d,%r9d
   92703:	jmp    927d1 <sessions::fast::parse_events_avx2+0x1031>
   92708:	mov    %edx,%ecx
   9270a:	add    $0xfffffffffffffff8,%rdx
   9270e:	lea    0x0(,%rdx,8),%esi
   92715:	xor    %eax,%eax
   92717:	cmp    $0x10,%ecx
   9271a:	movabs $0x3030303030303030,%r10
   92724:	shrx   %rsi,%r10,%rcx
   92729:	cmovae %rax,%rcx
   9272d:	mov    %edx,%esi
   9272f:	neg    %sil
   92732:	shl    $0x3,%sil
   92736:	shlx   %rsi,(%rbx),%rsi
   9273b:	or     %rsi,%rcx
   9273e:	xor    %r10,%rcx
   92741:	movabs $0x7676767676767676,%r9
   9274b:	lea    (%rcx,%r9,1),%rdi
   9274f:	or     %rsi,%rdi
   92752:	mov    $0xffffffff,%r13d
   92758:	movabs $0x8080808080808080,%r8
   92762:	test   %r8,%rdi
   92765:	je     9277f <sessions::fast::parse_events_avx2+0xfdf>
   92767:	movabs $0x7fffffffffffffff,%r10
   92771:	xor    %r9d,%r9d
   92774:	mov    0x8(%rsp),%rbx
   92779:	mov    (%rsp),%rbp
   9277d:	jmp    927d1 <sessions::fast::parse_events_avx2+0x1031>
   9277f:	mov    (%rbx,%rdx,1),%rax
   92783:	mov    %rax,%rdx
   92786:	xor    %r10,%rdx
   92789:	lea    (%rdx,%r9,1),%rsi
   9278d:	or     %rax,%rsi
   92790:	test   %r8,%rsi
   92793:	mov    (%rsp),%rbp
   92797:	je     928f7 <sessions::fast::parse_events_avx2+0x1157>
   9279d:	xor    %eax,%eax
   9279f:	movabs $0x7fffffffffffffff,%r10
   927a9:	xor    %r9d,%r9d
   927ac:	mov    0x8(%rsp),%rbx
   927b1:	jmp    927d1 <sessions::fast::parse_events_avx2+0x1031>
   927b3:	xor    %eax,%eax
   927b5:	movabs $0x7fffffffffffffff,%r10
   927bf:	xor    %r9d,%r9d
   927c2:	mov    0x8(%rsp),%rbx
   927c7:	mov    (%rsp),%rbp
   927cb:	mov    $0xffffffff,%r13d
   927d1:	incq   0x80(%rsp)
   927d9:	mov    %r11,%rcx
   927dc:	movabs $0x9e3779b97f4a7c15,%rdx
   927e6:	imul   %rdx,%rcx
   927ea:	movzbl 0x920(%rbp),%edx
   927f1:	xor    %esi,%esi
   927f3:	sub    %dl,%sil
   927f6:	shrx   %rsi,%rcx,%rbp
   927fb:	mov    0x68(%rbx),%rcx
   927ff:	movzbl (%rcx,%rbp,1),%esi
   92803:	mov    %rbx,%rdi
   92806:	mov    %rbp,%rbx
   92809:	shl    $0x6,%rbx
   9280d:	add    0x50(%rdi),%rbx
   92811:	lea    0x1(%rsi),%rdx
   92815:	shl    $0x5,%esi
   92818:	mov    %r11,(%rsi,%rbx,1)
   9281c:	mov    %rax,0x8(%rsi,%rbx,1)
   92821:	mov    %r10,0x10(%rsi,%rbx,1)
   92826:	mov    %r13d,0x18(%rsi,%rbx,1)
   9282b:	mov    %r9d,0x1c(%rsi,%rbx,1)
   92830:	cmp    $0x2,%rdx
   92834:	jne    928aa <sessions::fast::parse_events_avx2+0x110a>
   92836:	movb   $0x0,(%rcx,%rbp,1)
   9283a:	mov    0x8(%rdi),%rax
   9283e:	mov    0x20(%rdi),%rdx
   92842:	mov    (%rax,%rbp,8),%rcx
   92846:	cmp    (%rdx,%rbp,8),%rcx
   9284a:	mov    0x98(%rsp),%r8
   92852:	mov    0x4c(%rsp),%esi
   92856:	mov    0x88(%rsp),%r10d
   9285e:	je     934d6 <sessions::fast::parse_events_avx2+0x1d36>
   92864:	vmovaps (%rbx),%xmm0
   92868:	movntdq %xmm0,(%rcx)
   9286c:	lea    0x10(%rcx),%rdx
   92870:	vmovaps 0x10(%rbx),%xmm0
   92875:	movntdq %xmm0,(%rdx)
   92879:	lea    0x20(%rcx),%rdx
   9287d:	vmovaps 0x20(%rbx),%xmm0
   92882:	movntdq %xmm0,(%rdx)
   92886:	add    $0x30,%rcx
   9288a:	vmovdqa 0x30(%rbx),%xmm0
   9288f:	movntdq %xmm0,(%rcx)
   92893:	addq   $0x40,(%rax,%rbp,8)
   92898:	mov    0x70(%rsp),%r11
   9289d:	mov    0xd8(%rsp),%rbp
   928a5:	jmp    91cb0 <sessions::fast::parse_events_avx2+0x510>
   928aa:	mov    %dl,(%rcx,%rbp,1)
   928ad:	mov    0x70(%rsp),%r11
   928b2:	mov    0xd8(%rsp),%rbp
   928ba:	mov    0x98(%rsp),%r8
   928c2:	mov    0x4c(%rsp),%esi
   928c6:	mov    0x88(%rsp),%r10d
   928ce:	jmp    91cb0 <sessions::fast::parse_events_avx2+0x510>
   928d3:	movabs $0x7fffffffffffffff,%r10
   928dd:	xor    %r9d,%r9d
   928e0:	jmp    927c7 <sessions::fast::parse_events_avx2+0x1027>
   928e5:	movabs $0x7fffffffffffffff,%r10
   928ef:	xor    %r9d,%r9d
   928f2:	jmp    927d1 <sessions::fast::parse_events_avx2+0x1031>
   928f7:	lea    (%rcx,%rcx,4),%rax
   928fb:	shr    $0x8,%rcx
   928ff:	lea    (%rcx,%rax,2),%rax
   92903:	mov    %rax,%rcx
   92906:	movabs $0xff000000ff,%r8
   92910:	and    %r8,%rcx
   92913:	movabs $0xf424000000064,%rsi
   9291d:	imul   %rsi,%rcx
   92921:	shr    $0x10,%rax
   92925:	and    %r8,%rax
   92928:	movabs $0x271000000001,%rdi
   92932:	imul   %rdi,%rax
   92936:	add    %rcx,%rax
   92939:	shr    $0x20,%rax
   9293d:	lea    (%rdx,%rdx,4),%rcx
   92941:	shr    $0x8,%rdx
   92945:	lea    (%rdx,%rcx,2),%rcx
   92949:	mov    %rcx,%rdx
   9294c:	and    %r8,%rdx
   9294f:	imul   %rsi,%rdx
   92953:	shr    $0x10,%rcx
   92957:	and    %r8,%rcx
   9295a:	imul   %rdi,%rcx
   9295e:	add    %rdx,%rcx
   92961:	shr    $0x20,%rcx
   92965:	imul   $0x5f5e100,%rax,%r8
   9296c:	add    %rcx,%r8
   9296f:	mov    0x8(%rsp),%rbx
   92974:	mov    0x78(%rsp),%r9
   92979:	mov    0x50(%rsp),%r10
   9297e:	xor    %eax,%eax
   92980:	mov    $0xffffffff,%r13d
   92986:	cmp    %r10d,0x110(%rsp)
   9298e:	je     92b59 <sessions::fast::parse_events_avx2+0x13b9>
   92994:	mov    0x6c(%rsp),%edi
   92998:	cmp    %edi,0x90(%rsp)
   9299f:	je     92b59 <sessions::fast::parse_events_avx2+0x13b9>
   929a5:	mov    0x28(%rsp),%ecx
   929a9:	mov    %ecx,%ebx
   929ab:	vpextrd $0x2,%xmm1,%eax
   929b1:	add    0x20(%rsp),%rbx
   929b6:	mov    %eax,%edx
   929b8:	sub    %ecx,%edx
   929ba:	cmp    $0x19,%rdx
   929be:	mov    %r8,0x10(%rsp)
   929c3:	je     92b64 <sessions::fast::parse_events_avx2+0x13c4>
   929c9:	cmp    $0x14,%edx
   929cc:	mov    0x58(%rsp),%ebp
   929d0:	jne    92d97 <sessions::fast::parse_events_avx2+0x15f7>
   929d6:	cmpb   $0x5a,0x13(%rbx)
   929da:	jne    92e70 <sessions::fast::parse_events_avx2+0x16d0>
   929e0:	mov    %rdi,0x30(%rsp)
   929e5:	mov    %r10,0x50(%rsp)
   929ea:	mov    %r9,0x78(%rsp)
   929ef:	mov    (%rsp),%rsi
   929f3:	mov    %r11,%r13
   929f6:	mov    (%rbx),%rdx
   929f9:	mov    0x8e0(%rsi),%rax
   92a00:	imul   %rdx,%rax
   92a04:	shr    $0x3c,%rax
   92a08:	cmp    %rdx,0x698(%rsi,%rax,8)
   92a10:	jne    937fe <sessions::fast::parse_events_avx2+0x205e>
   92a16:	mov    0x718(%rsi,%rax,8),%rcx
   92a1e:	mov    %rsi,%rbp
   92a21:	mov    0x798(%rsi,%rax,8),%rdx
   92a29:	movzwl 0x8(%rbx),%edi
   92a2d:	xor    $0x3030,%rdi
   92a34:	mov    0xb(%rbx),%rsi
   92a38:	mov    %rsi,%rax
   92a3b:	movabs $0x3030303030303030,%r8
   92a45:	xor    %r8,%rax
   92a48:	lea    0x7676(%rdi),%r8d
   92a4f:	or     %edi,%r8d
   92a52:	and    $0x8080,%r8d
   92a59:	movabs $0x7676767676767676,%r9
   92a63:	add    %rax,%r9
   92a66:	or     %rsi,%r9
   92a69:	movabs $0x8080008080008080,%r10
   92a73:	and    %r10,%r9
   92a76:	xor    %r10d,%r10d
   92a79:	cmpb   $0x54,0xa(%rbx)
   92a7d:	setne  %r10b
   92a81:	movabs $0xff0000ff0000,%r11
   92a8b:	and    %r11,%rsi
   92a8e:	or     %r10,%rsi
   92a91:	or     %r9,%rsi
   92a94:	or     %r8,%rsi
   92a97:	movabs $0x3a00003a0000,%r8
   92aa1:	cmp    %r8,%rsi
   92aa4:	jne    930ef <sessions::fast::parse_events_avx2+0x194f>
   92aaa:	lea    (%rax,%rax,4),%rsi
   92aae:	shr    $0x8,%rax
   92ab2:	lea    (%rax,%rsi,2),%r9
   92ab6:	mov    %r9,%rax
   92ab9:	shr    $0x30,%rax
   92abd:	movzbl %al,%esi
   92ac0:	xor    %eax,%eax
   92ac2:	cmp    $0x3b,%rsi
   92ac6:	mov    0x8(%rsp),%rbx
   92acb:	mov    %r13,%r11
   92ace:	ja     9313a <sessions::fast::parse_events_avx2+0x199a>
   92ad4:	mov    %r9d,%r8d
   92ad7:	shr    $0x18,%r8d
   92adb:	cmp    $0x3b,%r8d
   92adf:	mov    $0xffffffff,%r13d
   92ae5:	ja     93147 <sessions::fast::parse_events_avx2+0x19a7>
   92aeb:	movzbl %r9b,%r9d
   92aef:	cmp    $0x17,%r9d
   92af3:	ja     93147 <sessions::fast::parse_events_avx2+0x19a7>
   92af9:	movzbl %dil,%r10d
   92afd:	lea    (%r10,%r10,4),%r10
   92b01:	shr    $0x8,%edi
   92b04:	lea    (%rdi,%r10,2),%rdi
   92b08:	test   %rdi,%rdi
   92b0b:	je     93147 <sessions::fast::parse_events_avx2+0x19a7>
   92b11:	cmp    %rdx,%rdi
   92b14:	jg     93147 <sessions::fast::parse_events_avx2+0x19a7>
   92b1a:	add    %rcx,%rdi
   92b1d:	imul   $0x15180,%rdi,%rax
   92b24:	imul   $0xe10,%r9,%rcx
   92b2b:	imul   $0x3c,%r8,%rdx
   92b2f:	add    %rsi,%rcx
   92b32:	add    %rdx,%rcx
   92b35:	add    %rax,%rcx
   92b38:	imul   $0x3e8,%rcx,%r8
   92b3f:	add    $0xfffffffffad9a400,%r8
   92b46:	mov    0x78(%rsp),%r9
   92b4b:	mov    0x50(%rsp),%r10
   92b50:	mov    0x58(%rsp),%ebp
   92b54:	jmp    92edd <sessions::fast::parse_events_avx2+0x173d>
   92b59:	xor    %r9d,%r9d
   92b5c:	mov    %r8,%r10
   92b5f:	jmp    927d1 <sessions::fast::parse_events_avx2+0x1031>
   92b64:	movzbl 0x13(%rbx),%r14d
   92b69:	cmp    $0x2b,%r14d
   92b6d:	mov    0x58(%rsp),%ebp
   92b71:	je     92b7d <sessions::fast::parse_events_avx2+0x13dd>
   92b73:	cmp    $0x2d,%r14d
   92b77:	jne    92e70 <sessions::fast::parse_events_avx2+0x16d0>
   92b7d:	mov    %rdi,0x30(%rsp)
   92b82:	mov    %r10,0x50(%rsp)
   92b87:	mov    %r9,0x78(%rsp)
   92b8c:	mov    %r11,0x28(%rsp)
   92b91:	mov    (%rbx),%rdx
   92b94:	mov    (%rsp),%rbp
   92b98:	mov    0x8e0(%rbp),%rax
   92b9f:	imul   %rdx,%rax
   92ba3:	shr    $0x3c,%rax
   92ba7:	cmp    %rdx,0x698(%rbp,%rax,8)
   92baf:	jne    93754 <sessions::fast::parse_events_avx2+0x1fb4>
   92bb5:	mov    0x718(%rbp,%rax,8),%rdx
   92bbd:	mov    0x798(%rbp,%rax,8),%rdi
   92bc5:	movzwl 0x8(%rbx),%r10d
   92bca:	xor    $0x3030,%r10
   92bd1:	mov    0xb(%rbx),%rcx
   92bd5:	mov    %rcx,%rax
   92bd8:	movabs $0x3030303030303030,%rsi
   92be2:	xor    %rsi,%rax
   92be5:	lea    0x7676(%r10),%esi
   92bec:	or     %r10d,%esi
   92bef:	and    $0x8080,%esi
   92bf5:	movabs $0x7676767676767676,%r8
   92bff:	add    %rax,%r8
   92c02:	or     %rcx,%r8
   92c05:	movabs $0x8080008080008080,%r9
   92c0f:	and    %r9,%r8
   92c12:	xor    %r9d,%r9d
   92c15:	cmpb   $0x54,0xa(%rbx)
   92c19:	setne  %r9b
   92c1d:	movabs $0xff0000ff0000,%r11
   92c27:	and    %r11,%rcx
   92c2a:	or     %r9,%rcx
   92c2d:	or     %r8,%rcx
   92c30:	or     %rsi,%rcx
   92c33:	movabs $0x3a00003a0000,%rsi
   92c3d:	cmp    %rsi,%rcx
   92c40:	jne    92f1a <sessions::fast::parse_events_avx2+0x177a>
   92c46:	lea    (%rax,%rax,4),%rcx
   92c4a:	shr    $0x8,%rax
   92c4e:	lea    (%rax,%rcx,2),%rsi
   92c52:	mov    %rsi,%rax
   92c55:	shr    $0x30,%rax
   92c59:	movzbl %al,%ecx
   92c5c:	xor    %eax,%eax
   92c5e:	cmp    $0x3b,%rcx
   92c62:	mov    0x28(%rsp),%r11
   92c67:	ja     93128 <sessions::fast::parse_events_avx2+0x1988>
   92c6d:	mov    %esi,%r8d
   92c70:	shr    $0x18,%r8d
   92c74:	cmp    $0x3b,%r8d
   92c78:	ja     93128 <sessions::fast::parse_events_avx2+0x1988>
   92c7e:	movzbl %sil,%r9d
   92c82:	cmp    $0x17,%r9d
   92c86:	ja     93128 <sessions::fast::parse_events_avx2+0x1988>
   92c8c:	movzbl %r10b,%esi
   92c90:	lea    (%rsi,%rsi,4),%rsi
   92c94:	shr    $0x8,%r10d
   92c98:	lea    (%r10,%rsi,2),%r10
   92c9c:	test   %r10,%r10
   92c9f:	je     93128 <sessions::fast::parse_events_avx2+0x1988>
   92ca5:	cmp    %rdi,%r10
   92ca8:	jg     93128 <sessions::fast::parse_events_avx2+0x1988>
   92cae:	cmpb   $0x3a,0x16(%rbx)
   92cb2:	jne    93126 <sessions::fast::parse_events_avx2+0x1986>
   92cb8:	movzbl 0x14(%rbx),%esi
   92cbc:	add    $0xd0,%sil
   92cc0:	xor    %eax,%eax
   92cc2:	cmp    $0x9,%sil
   92cc6:	ja     93128 <sessions::fast::parse_events_avx2+0x1988>
   92ccc:	movzbl 0x15(%rbx),%r11d
   92cd1:	add    $0xd0,%r11b
   92cd5:	cmp    $0x9,%r11b
   92cd9:	ja     92f1c <sessions::fast::parse_events_avx2+0x177c>
   92cdf:	movzbl 0x17(%rbx),%ebp
   92ce3:	add    $0xd0,%bpl
   92ce7:	cmp    $0x9,%bpl
   92ceb:	ja     933f1 <sessions::fast::parse_events_avx2+0x1c51>
   92cf1:	movzbl 0x18(%rbx),%edi
   92cf5:	add    $0xd0,%dil
   92cf9:	cmp    $0x9,%dil
   92cfd:	ja     933f1 <sessions::fast::parse_events_avx2+0x1c51>
   92d03:	movzbl %sil,%eax
   92d07:	add    %eax,%eax
   92d09:	lea    (%rax,%rax,4),%esi
   92d0c:	add    %r11b,%sil
   92d0f:	xor    %eax,%eax
   92d11:	cmp    $0x17,%sil
   92d15:	mov    0x8(%rsp),%rbx
   92d1a:	ja     93408 <sessions::fast::parse_events_avx2+0x1c68>
   92d20:	movzbl %bpl,%r11d
   92d24:	add    %r11d,%r11d
   92d27:	lea    (%r11,%r11,4),%r11d
   92d2b:	add    %dil,%r11b
   92d2e:	cmp    $0x3b,%r11b
   92d32:	ja     93408 <sessions::fast::parse_events_avx2+0x1c68>
   92d38:	add    %rdx,%r10
   92d3b:	imul   $0x15180,%r10,%rax
   92d42:	imul   $0xe10,%r9,%rdx
   92d49:	imul   $0x3c,%r8,%rdi
   92d4d:	add    %rcx,%rdx
   92d50:	add    %rdi,%rdx
   92d53:	add    %rax,%rdx
   92d56:	imul   $0x3e8,%rdx,%rax
   92d5d:	add    $0xfffffffffad9a400,%rax
   92d63:	movzbl %r11b,%ecx
   92d67:	movzbl %sil,%edx
   92d6b:	imul   $0x36ee80,%rdx,%rdx
   92d72:	imul   $0xea60,%rcx,%rcx
   92d79:	add    %rdx,%rcx
   92d7c:	mov    %rcx,%r8
   92d7f:	neg    %r8
   92d82:	cmp    $0x2b,%r14b
   92d86:	cmovne %rcx,%r8
   92d8a:	add    %rax,%r8
   92d8d:	mov    0x28(%rsp),%r11
   92d92:	jmp    92b46 <sessions::fast::parse_events_avx2+0x13a6>
   92d97:	lea    -0x1(%rdx),%ecx
   92d9a:	cmp    $0x10,%ecx
   92d9d:	jae    92e54 <sessions::fast::parse_events_avx2+0x16b4>
   92da3:	cmp    $0x9,%edx
   92da6:	jae    93057 <sessions::fast::parse_events_avx2+0x18b7>
   92dac:	lea    0x0(,%rdx,8),%ecx
   92db3:	xor    %eax,%eax
   92db5:	cmp    $0x8,%rdx
   92db9:	movabs $0x3030303030303030,%rsi
   92dc3:	shrx   %rcx,%rsi,%rcx
   92dc8:	cmove  %rax,%rcx
   92dcc:	neg    %dl
   92dce:	shl    $0x3,%dl
   92dd1:	shlx   %rdx,(%rbx),%rdx
   92dd6:	or     %rdx,%rcx
   92dd9:	xor    %rsi,%rcx
   92ddc:	movabs $0x7676767676767676,%rsi
   92de6:	add    %rcx,%rsi
   92de9:	or     %rdx,%rsi
   92dec:	movabs $0x8080808080808080,%rdx
   92df6:	test   %rdx,%rsi
   92df9:	jne    930d9 <sessions::fast::parse_events_avx2+0x1939>
   92dff:	mov    %rdi,0x30(%rsp)
   92e04:	lea    (%rcx,%rcx,4),%rax
   92e08:	shr    $0x8,%rcx
   92e0c:	lea    (%rcx,%rax,2),%r8
   92e10:	mov    %r8,%rax
   92e13:	movabs $0xff000000ff,%rdx
   92e1d:	and    %rdx,%rax
   92e20:	movabs $0xf424000000064,%rcx
   92e2a:	imul   %rcx,%rax
   92e2e:	shr    $0x10,%r8
   92e32:	and    %rdx,%r8
   92e35:	movabs $0x271000000001,%rcx
   92e3f:	imul   %rcx,%r8
   92e43:	add    %rax,%r8
   92e46:	shr    $0x20,%r8
   92e4a:	mov    0x8(%rsp),%rbx
   92e4f:	jmp    92edd <sessions::fast::parse_events_avx2+0x173d>
   92e54:	cmp    0x28(%rsp),%eax
   92e58:	jne    92e70 <sessions::fast::parse_events_avx2+0x16d0>
   92e5a:	xor    %eax,%eax
   92e5c:	xor    %r9d,%r9d
   92e5f:	mov    0x8(%rsp),%rbx
   92e64:	mov    %r8,%r10
   92e67:	mov    (%rsp),%rbp
   92e6b:	jmp    927d1 <sessions::fast::parse_events_avx2+0x1031>
   92e70:	mov    %rdi,0x30(%rsp)
   92e75:	xor    %ecx,%ecx
   92e77:	xor    %eax,%eax
   92e79:	xor    %esi,%esi
   92e7b:	xor    %r8d,%r8d
   92e7e:	xchg   %ax,%ax
   92e80:	movzbl (%rbx,%rcx,1),%edi
   92e84:	add    $0xd0,%dil
   92e88:	cmp    $0x9,%dil
   92e8c:	ja     92efc <sessions::fast::parse_events_avx2+0x175c>
   92e8e:	test   %dil,%dil
   92e91:	mov    %r8,%r13
   92e94:	setne  %r8b
   92e98:	or     %r8b,%sil
   92e9b:	movzbl %sil,%r8d
   92e9f:	and    $0x1,%r8d
   92ea3:	add    %r8d,%eax
   92ea6:	lea    0x0(,%r13,4),%r8
   92eae:	add    %r13,%r8
   92eb1:	movzbl %dil,%edi
   92eb5:	lea    (%rdi,%r8,2),%r8
   92eb9:	inc    %rcx
   92ebc:	cmp    %rcx,%rdx
   92ebf:	jne    92e80 <sessions::fast::parse_events_avx2+0x16e0>
   92ec1:	cmp    $0x14,%eax
   92ec4:	setb   %al
   92ec7:	test   %r8,%r8
   92eca:	setns  %cl
   92ecd:	and    %al,%cl
   92ecf:	cmp    $0x1,%cl
   92ed2:	mov    0x8(%rsp),%rbx
   92ed7:	jne    93048 <sessions::fast::parse_events_avx2+0x18a8>
   92edd:	mov    (%rsp),%rdx
   92ee1:	cmp    %r8,0x8e8(%rdx)
   92ee8:	jle    92f33 <sessions::fast::parse_events_avx2+0x1793>
   92eea:	xor    %eax,%eax
   92eec:	xor    %r9d,%r9d
   92eef:	mov    0x10(%rsp),%r10
   92ef4:	mov    %rdx,%rbp
   92ef7:	jmp    927cb <sessions::fast::parse_events_avx2+0x102b>
   92efc:	xor    %eax,%eax
   92efe:	mov    0x8(%rsp),%rbx
   92f03:	mov    0x10(%rsp),%r10
   92f08:	mov    (%rsp),%rbp
   92f0c:	mov    $0xffffffff,%r13d
   92f12:	xor    %r9d,%r9d
   92f15:	jmp    927d1 <sessions::fast::parse_events_avx2+0x1031>
   92f1a:	xor    %eax,%eax
   92f1c:	xor    %r9d,%r9d
   92f1f:	mov    0x8(%rsp),%rbx
   92f24:	mov    0x28(%rsp),%r11
   92f29:	mov    0x10(%rsp),%r10
   92f2e:	jmp    927cb <sessions::fast::parse_events_avx2+0x102b>
   92f33:	xor    %eax,%eax
   92f35:	mov    0x10(%rsp),%rdi
   92f3a:	cmp    %r8,%rdi
   92f3d:	setns  %al
   92f40:	movabs $0x7fffffffffffffff,%rcx
   92f4a:	add    %rcx,%rax
   92f4d:	mov    %rdi,%rcx
   92f50:	sub    %r8,%rcx
   92f53:	cmovo  %rax,%rcx
   92f57:	xor    %eax,%eax
   92f59:	cmp    0x8f0(%rdx),%r8
   92f60:	jge    93106 <sessions::fast::parse_events_avx2+0x1966>
   92f66:	cmp    $0x5265c00,%rcx
   92f6d:	jg     93106 <sessions::fast::parse_events_avx2+0x1966>
   92f73:	mov    0xc0(%rsp),%rcx
   92f7b:	sub    %ebp,%ecx
   92f7d:	mov    %ebp,%eax
   92f7f:	cmp    $0x8,%ecx
   92f82:	je     93154 <sessions::fast::parse_events_avx2+0x19b4>
   92f88:	cmp    $0x4,%ecx
   92f8b:	movzbl 0xd0(%rsp),%esi
   92f93:	mov    (%rsp),%rbp
   92f97:	jne    9335f <sessions::fast::parse_events_avx2+0x1bbf>
   92f9d:	mov    0x20(%rsp),%rdx
   92fa2:	movzbl (%rdx,%rax,1),%ecx
   92fa6:	cmp    $0x63,%ecx
   92fa9:	mov    $0xffffffff,%r13d
   92faf:	je     934a1 <sessions::fast::parse_events_avx2+0x1d01>
   92fb5:	cmp    $0x76,%ecx
   92fb8:	jne    934c9 <sessions::fast::parse_events_avx2+0x1d29>
   92fbe:	cmpb   $0x69,0x1(%rdx,%rax,1)
   92fc3:	jne    934c9 <sessions::fast::parse_events_avx2+0x1d29>
   92fc9:	cmpb   $0x65,0x2(%rdx,%rax,1)
   92fce:	jne    934c9 <sessions::fast::parse_events_avx2+0x1d29>
   92fd4:	xor    %ecx,%ecx
   92fd6:	cmpb   $0x77,0x3(%rdx,%rax,1)
   92fdb:	jne    934bc <sessions::fast::parse_events_avx2+0x1d1c>
   92fe1:	mov    %r8,0x58(%rsp)
   92fe6:	movzbl 0xf0(%rsp),%eax
   92fee:	mov    %rcx,0x40(%rsp)
   92ff3:	and    %al,%sil
   92ff6:	je     93b7e <sessions::fast::parse_events_avx2+0x23de>
   92ffc:	mov    %rbp,%r8
   92fff:	mov    %rdi,%rbp
   93002:	vextracti128 $0x1,%ymm0,%xmm0
   93008:	vpextrd $0x1,%xmm0,%ecx
   9300e:	vmovd  %xmm0,%edx
   93012:	vpextrd $0x2,%xmm0,%eax
   93018:	shl    $0x24,%rdx
   9301c:	shl    $0xc,%rcx
   93020:	or     %rdx,%rcx
   93023:	shr    $0xc,%eax
   93026:	or     %rcx,%rax
   93029:	mov    0x58(%rsp),%rcx
   9302e:	sub    0x8f8(%r8),%ecx
   93035:	mov    %ecx,%r13d
   93038:	mov    %rbp,%r10
   9303b:	mov    %r8,%rbp
   9303e:	mov    0x40(%rsp),%r9
   93043:	jmp    927d1 <sessions::fast::parse_events_avx2+0x1031>
   93048:	xor    %eax,%eax
   9304a:	xor    %r9d,%r9d
   9304d:	mov    0x10(%rsp),%r10
   93052:	jmp    927c7 <sessions::fast::parse_events_avx2+0x1027>
   93057:	mov    %rdi,0x30(%rsp)
   9305c:	mov    %r10,0x50(%rsp)
   93061:	mov    %r9,%rbp
   93064:	mov    %edx,%ecx
   93066:	add    $0xfffffffffffffff8,%rdx
   9306a:	lea    0x0(,%rdx,8),%esi
   93071:	xor    %eax,%eax
   93073:	cmp    $0x10,%ecx
   93076:	movabs $0x3030303030303030,%r10
   93080:	shrx   %rsi,%r10,%rcx
   93085:	cmovae %rax,%rcx
   93089:	mov    %edx,%esi
   9308b:	neg    %sil
   9308e:	shl    $0x3,%sil
   93092:	shlx   %rsi,(%rbx),%rsi
   93097:	or     %rsi,%rcx
   9309a:	xor    %r10,%rcx
   9309d:	movabs $0x7676767676767676,%r9
   930a7:	lea    (%rcx,%r9,1),%rdi
   930ab:	or     %rsi,%rdi
   930ae:	movabs $0x8080808080808080,%r8
   930b8:	test   %r8,%rdi
   930bb:	jne    930d9 <sessions::fast::parse_events_avx2+0x1939>
   930bd:	mov    (%rbx,%rdx,1),%rax
   930c1:	mov    %rax,%rdx
   930c4:	xor    %r10,%rdx
   930c7:	lea    (%rdx,%r9,1),%rsi
   930cb:	or     %rax,%rsi
   930ce:	test   %r8,%rsi
   930d1:	je     9336c <sessions::fast::parse_events_avx2+0x1bcc>
   930d7:	xor    %eax,%eax
   930d9:	xor    %r9d,%r9d
   930dc:	mov    0x8(%rsp),%rbx
   930e1:	mov    0x10(%rsp),%r10
   930e6:	mov    (%rsp),%rbp
   930ea:	jmp    927d1 <sessions::fast::parse_events_avx2+0x1031>
   930ef:	xor    %eax,%eax
   930f1:	xor    %r9d,%r9d
   930f4:	mov    0x8(%rsp),%rbx
   930f9:	mov    %r13,%r11
   930fc:	mov    0x10(%rsp),%r10
   93101:	jmp    927cb <sessions::fast::parse_events_avx2+0x102b>
   93106:	xor    %r9d,%r9d
   93109:	mov    %rdi,%r10
   9310c:	jmp    927c7 <sessions::fast::parse_events_avx2+0x1027>
   93111:	movabs $0x7fffffffffffffff,%r10
   9311b:	xor    %r9d,%r9d
   9311e:	mov    %r13,%r11
   93121:	jmp    927c7 <sessions::fast::parse_events_avx2+0x1027>
   93126:	xor    %eax,%eax
   93128:	xor    %r9d,%r9d
   9312b:	mov    0x8(%rsp),%rbx
   93130:	mov    0x10(%rsp),%r10
   93135:	jmp    927cb <sessions::fast::parse_events_avx2+0x102b>
   9313a:	xor    %r9d,%r9d
   9313d:	mov    0x10(%rsp),%r10
   93142:	jmp    927cb <sessions::fast::parse_events_avx2+0x102b>
   93147:	xor    %r9d,%r9d
   9314a:	mov    0x10(%rsp),%r10
   9314f:	jmp    927d1 <sessions::fast::parse_events_avx2+0x1031>
   93154:	mov    0x20(%rsp),%rcx
   93159:	cmpb   $0x70,(%rcx,%rax,1)
   9315d:	mov    (%rsp),%rbp
   93161:	jne    9335f <sessions::fast::parse_events_avx2+0x1bbf>
   93167:	cmpb   $0x75,0x1(%rcx,%rax,1)
   9316c:	jne    9335f <sessions::fast::parse_events_avx2+0x1bbf>
   93172:	cmpb   $0x72,0x2(%rcx,%rax,1)
   93177:	jne    9335f <sessions::fast::parse_events_avx2+0x1bbf>
   9317d:	cmpb   $0x63,0x3(%rcx,%rax,1)
   93182:	jne    9335f <sessions::fast::parse_events_avx2+0x1bbf>
   93188:	cmpb   $0x68,0x4(%rcx,%rax,1)
   9318d:	jne    9335f <sessions::fast::parse_events_avx2+0x1bbf>
   93193:	cmpb   $0x61,0x5(%rcx,%rax,1)
   93198:	jne    9335f <sessions::fast::parse_events_avx2+0x1bbf>
   9319e:	cmpb   $0x73,0x6(%rcx,%rax,1)
   931a3:	jne    9335f <sessions::fast::parse_events_avx2+0x1bbf>
   931a9:	mov    %rdi,%rbp
   931ac:	cmpb   $0x65,0x7(%rcx,%rax,1)
   931b1:	jne    938ab <sessions::fast::parse_events_avx2+0x210b>
   931b7:	mov    %r8,0x58(%rsp)
   931bc:	vmovdqu %ymm0,0x160(%rsp)
   931c5:	mov    %r10,0x50(%rsp)
   931ca:	mov    %r9,0x78(%rsp)
   931cf:	mov    %r11,0x28(%rsp)
   931d4:	mov    0x40(%rsp),%eax
   931d8:	mov    %eax,%edi
   931da:	add    %rcx,%rdi
   931dd:	mov    0x100(%rsp),%rsi
   931e5:	sub    %eax,%esi
   931e7:	vzeroupper
   931ea:	call   9d580 <sessions::events::parse_price>
   931ef:	test   $0x1,%al
   931f1:	je     93985 <sessions::fast::parse_events_avx2+0x21e5>
   931f7:	test   %edx,%edx
   931f9:	je     939f5 <sessions::fast::parse_events_avx2+0x2255>
   931ff:	mov    %edx,0x40(%rsp)
   93203:	mov    0x90(%rsp),%rsi
   9320b:	sub    0x6c(%rsp),%esi
   9320f:	cmp    $0xa,%esi
   93212:	mov    0x30(%rsp),%rdi
   93217:	ja     93b65 <sessions::fast::parse_events_avx2+0x23c5>
   9321d:	mov    0x20(%rsp),%rax
   93222:	vmovdqu (%rax,%rdi,1),%xmm1
   93227:	vmovd  %esi,%xmm0
   9322b:	vpbroadcastb %xmm0,%xmm0
   93230:	vpcmpgtb -0x8a2c8(%rip),%xmm0,%xmm0        # 8f70 <__abi_tag+0x8c74>
   93238:	vpaddb -0x8a620(%rip),%xmm1,%xmm2        # 8c20 <__abi_tag+0x8924>
   93240:	vpminub -0x8aa88(%rip),%xmm2,%xmm3        # 87c0 <__abi_tag+0x84c4>
   93248:	vpcmpeqb %xmm3,%xmm2,%xmm2
   9324c:	vpaddb -0x8a774(%rip),%xmm1,%xmm3        # 8ae0 <__abi_tag+0x87e4>
   93254:	vmovdqa -0x8af5c(%rip),%xmm5        # 8300 <__abi_tag+0x8004>
   9325c:	vpminub %xmm5,%xmm3,%xmm4
   93260:	vpcmpeqb %xmm4,%xmm3,%xmm3
   93264:	vpaddb -0x8b22c(%rip),%xmm1,%xmm4        # 8040 <__abi_tag+0x7d44>
   9326c:	vpminub %xmm5,%xmm4,%xmm5
   93270:	vpcmpeqb %xmm5,%xmm4,%xmm5
   93274:	vpcmpeqb -0x8a9fc(%rip),%xmm1,%xmm4        # 8880 <__abi_tag+0x8584>
   9327c:	vpor   %xmm2,%xmm3,%xmm6
   93280:	vpor   %xmm5,%xmm4,%xmm7
   93284:	vpor   %xmm6,%xmm7,%xmm6
   93288:	vpandn %xmm0,%xmm6,%xmm6
   9328c:	vpmovmskb %xmm6,%eax
   93290:	test   %eax,%eax
   93292:	jne    93b65 <sessions::fast::parse_events_avx2+0x23c5>
   93298:	vpaddb -0x8b350(%rip),%xmm1,%xmm6        # 7f50 <__abi_tag+0x7c54>
   932a0:	vpand  %xmm6,%xmm5,%xmm5
   932a4:	vpaddb -0x8a3ec(%rip),%xmm1,%xmm6        # 8ec0 <__abi_tag+0x8bc4>
   932ac:	vpand  %xmm6,%xmm3,%xmm3
   932b0:	vpaddb -0x8ae28(%rip),%xmm1,%xmm1        # 8490 <__abi_tag+0x8194>
   932b8:	vpand  %xmm1,%xmm2,%xmm1
   932bc:	vpor   %xmm3,%xmm1,%xmm1
   932c0:	vpand  -0x8aa38(%rip),%xmm4,%xmm2        # 8890 <__abi_tag+0x8594>
   932c8:	vpor   %xmm2,%xmm5,%xmm2
   932cc:	vpor   %xmm1,%xmm2,%xmm1
   932d0:	vpand  %xmm1,%xmm0,%xmm0
   932d4:	vpmaddubsw -0x8b37d(%rip),%xmm0,%xmm0        # 7f60 <__abi_tag+0x7c64>
   932dd:	vpmaddwd -0x8aa45(%rip),%xmm0,%xmm0        # 88a0 <__abi_tag+0x85a4>
   932e5:	vpextrd $0x1,%xmm0,%eax
   932eb:	vmovd  %xmm0,%ecx
   932ef:	vpextrd $0x2,%xmm0,%edx
   932f5:	shl    $0x24,%rcx
   932f9:	shl    $0xc,%rax
   932fd:	or     %rcx,%rax
   93300:	shr    $0xc,%edx
   93303:	or     %rax,%rdx
   93306:	mov    %rdx,%rcx
   93309:	movabs $0x9e3779b97f4a7c15,%rax
   93313:	imul   %rax,%rcx
   93317:	shr    $0x20,%rcx
   9331b:	mov    (%rsp),%r8
   9331f:	mov    0x10(%r8),%rsi
   93323:	mov    0x30(%r8),%rax
   93327:	mov    %eax,%edi
   93329:	and    %ecx,%edi
   9332b:	cmp    %rsi,%rdi
   9332e:	jae    95f86 <sessions::fast::parse_events_avx2+0x47e6>
   93334:	mov    0x8(%r8),%rcx
   93338:	mov    (%rcx,%rdi,8),%r8
   9333c:	cmp    %rdx,%r8
   9333f:	je     93a89 <sessions::fast::parse_events_avx2+0x22e9>
   93345:	cmp    $0xffffffffffffffff,%r8
   93349:	je     93aa6 <sessions::fast::parse_events_avx2+0x2306>
   9334f:	inc    %rdi
   93352:	and    %rax,%rdi
   93355:	cmp    %rsi,%rdi
   93358:	jb     93338 <sessions::fast::parse_events_avx2+0x1b98>
   9335a:	jmp    95f86 <sessions::fast::parse_events_avx2+0x47e6>
   9335f:	xor    %eax,%eax
   93361:	xor    %r9d,%r9d
   93364:	mov    %rdi,%r10
   93367:	jmp    927cb <sessions::fast::parse_events_avx2+0x102b>
   9336c:	lea    (%rcx,%rcx,4),%rax
   93370:	shr    $0x8,%rcx
   93374:	lea    (%rcx,%rax,2),%rax
   93378:	mov    %rax,%rcx
   9337b:	movabs $0xff000000ff,%r8
   93385:	and    %r8,%rcx
   93388:	movabs $0xf424000000064,%rsi
   93392:	imul   %rsi,%rcx
   93396:	shr    $0x10,%rax
   9339a:	and    %r8,%rax
   9339d:	movabs $0x271000000001,%rdi
   933a7:	imul   %rdi,%rax
   933ab:	add    %rcx,%rax
   933ae:	shr    $0x20,%rax
   933b2:	lea    (%rdx,%rdx,4),%rcx
   933b6:	shr    $0x8,%rdx
   933ba:	lea    (%rdx,%rcx,2),%rcx
   933be:	mov    %rcx,%rdx
   933c1:	and    %r8,%rdx
   933c4:	imul   %rsi,%rdx
   933c8:	shr    $0x10,%rcx
   933cc:	and    %r8,%rcx
   933cf:	imul   %rdi,%rcx
   933d3:	add    %rdx,%rcx
   933d6:	shr    $0x20,%rcx
   933da:	imul   $0x5f5e100,%rax,%r8
   933e1:	add    %rcx,%r8
   933e4:	mov    0x8(%rsp),%rbx
   933e9:	mov    %rbp,%r9
   933ec:	jmp    92b4b <sessions::fast::parse_events_avx2+0x13ab>
   933f1:	xor    %r9d,%r9d
   933f4:	mov    0x8(%rsp),%rbx
   933f9:	mov    0x28(%rsp),%r11
   933fe:	mov    0x10(%rsp),%r10
   93403:	jmp    927c7 <sessions::fast::parse_events_avx2+0x1027>
   93408:	xor    %r9d,%r9d
   9340b:	mov    0x28(%rsp),%r11
   93410:	mov    0x10(%rsp),%r10
   93415:	jmp    927c7 <sessions::fast::parse_events_avx2+0x1027>
   9341a:	add    0x20(%rsp),%rdi
   9341f:	mov    %rax,%rsi
   93422:	mov    %r8,%rbx
   93425:	mov    %r9,0x78(%rsp)
   9342a:	mov    %r10,0x50(%rsp)
   9342f:	vmovdqu %ymm0,0x160(%rsp)
   93438:	vzeroupper
   9343b:	call   a1950 <sessions::fast::keys::intern_exotic>
   93440:	vmovdqu 0x160(%rsp),%ymm0
   93449:	mov    0x50(%rsp),%r10
   9344e:	mov    0x78(%rsp),%r9
   93453:	mov    %rbx,%r8
   93456:	vpbroadcastb -0x89bd3(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   9345f:	vpbroadcastb -0x89bdd(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   93468:	vpbroadcastb -0x89be7(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   93471:	vpbroadcastb -0x89bf1(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   9347a:	vpbroadcastb -0x89bfb(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   93483:	vpbroadcastb -0x89c05(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   9348c:	vpbroadcastb -0x89c0f(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   93495:	vpxor  %xmm7,%xmm7,%xmm7
   93499:	mov    %rax,%r11
   9349c:	jmp    92114 <sessions::fast::parse_events_avx2+0x974>
   934a1:	cmpb   $0x61,0x1(%rdx,%rax,1)
   934a6:	jne    934c9 <sessions::fast::parse_events_avx2+0x1d29>
   934a8:	cmpb   $0x72,0x2(%rdx,%rax,1)
   934ad:	jne    934c9 <sessions::fast::parse_events_avx2+0x1d29>
   934af:	xor    %ecx,%ecx
   934b1:	cmpb   $0x74,0x3(%rdx,%rax,1)
   934b6:	je     92fe1 <sessions::fast::parse_events_avx2+0x1841>
   934bc:	xor    %eax,%eax
   934be:	mov    %rdi,%r10
   934c1:	xor    %r9d,%r9d
   934c4:	jmp    927d1 <sessions::fast::parse_events_avx2+0x1031>
   934c9:	xor    %eax,%eax
   934cb:	xor    %r9d,%r9d
   934ce:	mov    %rdi,%r10
   934d1:	jmp    927d1 <sessions::fast::parse_events_avx2+0x1031>
   934d6:	mov    0x8(%rsp),%r14
   934db:	mov    %r14,%rdi
   934de:	mov    0x140(%rsp),%rsi
   934e6:	mov    %rbp,%rdx
   934e9:	vzeroupper
   934ec:	call   78a10 <<sessions::fast::sink::Sink<sessions::fast::EventRec>>::refill>
   934f1:	mov    0x88(%rsp),%r10d
   934f9:	mov    0x4c(%rsp),%esi
   934fd:	mov    0x98(%rsp),%r8
   93505:	vpbroadcastb -0x89c7f(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   9350e:	vpbroadcastb -0x89c89(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   93517:	vpbroadcastb -0x89c93(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   93520:	vpbroadcastb -0x89c9d(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   93529:	vpbroadcastb -0x89ca7(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   93532:	vpbroadcastb -0x89cb1(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   9353b:	vpbroadcastb -0x89cbb(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   93544:	vpbroadcastb -0x89cc5(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   9354d:	vpbroadcastb -0x89ccf(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   93556:	vpbroadcastb -0x89cd9(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   9355f:	vpxor  %xmm7,%xmm7,%xmm7
   93563:	mov    0x8(%r14),%rax
   93567:	mov    (%rax,%rbp,8),%rcx
   9356b:	jmp    92864 <sessions::fast::parse_events_avx2+0x10c4>
   93570:	vmovdqu %ymm0,0x160(%rsp)
   93579:	lea    0x98(%rcx),%rsi
   93580:	lea    0xa0(%rsp),%rdi
   93588:	vzeroupper
   9358b:	call   729f0 <<sessions::fast::ts::Calendar>::month_slow>
   93590:	cmpb   $0x0,0xa0(%rsp)
   93598:	je     936d0 <sessions::fast::parse_events_avx2+0x1f30>
   9359e:	mov    0xa8(%rsp),%rdx
   935a6:	mov    0xb0(%rsp),%r8
   935ae:	vpxor  %xmm7,%xmm7,%xmm7
   935b2:	vpbroadcastb -0x89d35(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   935bb:	vpbroadcastb -0x89d3d(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   935c4:	vpbroadcastb -0x89d45(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   935cd:	vpbroadcastb -0x89d4d(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   935d6:	vpbroadcastb -0x89d55(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   935df:	vpbroadcastb -0x89d5d(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   935e8:	vpbroadcastb -0x89d65(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   935f1:	vpbroadcastb -0x89d6d(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   935fa:	vpbroadcastb -0x89d75(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   93603:	vpbroadcastb -0x89d7d(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   9360c:	vmovdqu 0x160(%rsp),%ymm0
   93615:	vmovdqa 0x10(%rsp),%xmm1
   9361b:	jmp    92360 <sessions::fast::parse_events_avx2+0xbc0>
   93620:	vmovdqu %ymm0,0x160(%rsp)
   93629:	add    $0x98,%rsi
   93630:	lea    0xa0(%rsp),%rdi
   93638:	vzeroupper
   9363b:	call   729f0 <<sessions::fast::ts::Calendar>::month_slow>
   93640:	cmpb   $0x0,0xa0(%rsp)
   93648:	je     936d0 <sessions::fast::parse_events_avx2+0x1f30>
   9364e:	mov    0xa8(%rsp),%r14
   93656:	mov    0xb0(%rsp),%rdx
   9365e:	vpxor  %xmm7,%xmm7,%xmm7
   93662:	vpbroadcastb -0x89de5(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   9366b:	vpbroadcastb -0x89ded(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   93674:	vpbroadcastb -0x89df5(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   9367d:	vpbroadcastb -0x89dfd(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   93686:	vpbroadcastb -0x89e05(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   9368f:	vpbroadcastb -0x89e0d(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   93698:	vpbroadcastb -0x89e15(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   936a1:	vpbroadcastb -0x89e1d(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   936aa:	vpbroadcastb -0x89e25(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   936b3:	vpbroadcastb -0x89e2d(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   936bc:	vmovdqu 0x160(%rsp),%ymm0
   936c5:	vmovdqa 0x10(%rsp),%xmm1
   936cb:	jmp    921c0 <sessions::fast::parse_events_avx2+0xa20>
   936d0:	xor    %eax,%eax
   936d2:	movabs $0x7fffffffffffffff,%r10
   936dc:	xor    %r9d,%r9d
   936df:	vpxor  %xmm7,%xmm7,%xmm7
   936e3:	vpbroadcastb -0x89e66(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   936ec:	vpbroadcastb -0x89e6e(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   936f5:	vpbroadcastb -0x89e76(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   936fe:	vpbroadcastb -0x89e7e(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   93707:	vpbroadcastb -0x89e86(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   93710:	vpbroadcastb -0x89e8e(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   93719:	vpbroadcastb -0x89e96(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   93722:	vpbroadcastb -0x89e9e(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   9372b:	vpbroadcastb -0x89ea6(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   93734:	vpbroadcastb -0x89eae(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   9373d:	mov    0x8(%rsp),%rbx
   93742:	mov    %r13,%r11
   93745:	mov    $0xffffffff,%r13d
   9374b:	mov    (%rsp),%rbp
   9374f:	jmp    927d1 <sessions::fast::parse_events_avx2+0x1031>
   93754:	vmovdqu %ymm0,0x160(%rsp)
   9375d:	lea    0x98(%rbp),%rsi
   93764:	lea    0xa0(%rsp),%rdi
   9376c:	vzeroupper
   9376f:	call   729f0 <<sessions::fast::ts::Calendar>::month_slow>
   93774:	cmpb   $0x0,0xa0(%rsp)
   9377c:	je     938b5 <sessions::fast::parse_events_avx2+0x2115>
   93782:	mov    0xa8(%rsp),%rdx
   9378a:	mov    0xb0(%rsp),%rdi
   93792:	vpxor  %xmm7,%xmm7,%xmm7
   93796:	vpbroadcastb -0x89f19(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   9379f:	vpbroadcastb -0x89f21(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   937a8:	vpbroadcastb -0x89f29(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   937b1:	vpbroadcastb -0x89f31(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   937ba:	vpbroadcastb -0x89f39(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   937c3:	vpbroadcastb -0x89f41(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   937cc:	vpbroadcastb -0x89f49(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   937d5:	vpbroadcastb -0x89f51(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   937de:	vpbroadcastb -0x89f59(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   937e7:	vpbroadcastb -0x89f61(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   937f0:	vmovdqu 0x160(%rsp),%ymm0
   937f9:	jmp    92bc5 <sessions::fast::parse_events_avx2+0x1425>
   937fe:	vmovdqu %ymm0,0x160(%rsp)
   93807:	mov    %rsi,%rbp
   9380a:	add    $0x98,%rsi
   93811:	lea    0xa0(%rsp),%rdi
   93819:	vzeroupper
   9381c:	call   729f0 <<sessions::fast::ts::Calendar>::month_slow>
   93821:	cmpb   $0x0,0xa0(%rsp)
   93829:	je     9391d <sessions::fast::parse_events_avx2+0x217d>
   9382f:	mov    0xa8(%rsp),%rcx
   93837:	mov    0xb0(%rsp),%rdx
   9383f:	vpxor  %xmm7,%xmm7,%xmm7
   93843:	vpbroadcastb -0x89fc6(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   9384c:	vpbroadcastb -0x89fce(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   93855:	vpbroadcastb -0x89fd6(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   9385e:	vpbroadcastb -0x89fde(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   93867:	vpbroadcastb -0x89fe6(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   93870:	vpbroadcastb -0x89fee(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   93879:	vpbroadcastb -0x89ff6(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   93882:	vpbroadcastb -0x89ffe(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   9388b:	vpbroadcastb -0x8a006(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   93894:	vpbroadcastb -0x8a00e(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   9389d:	vmovdqu 0x160(%rsp),%ymm0
   938a6:	jmp    92a29 <sessions::fast::parse_events_avx2+0x1289>
   938ab:	xor    %eax,%eax
   938ad:	xor    %r9d,%r9d
   938b0:	jmp    939ed <sessions::fast::parse_events_avx2+0x224d>
   938b5:	xor    %eax,%eax
   938b7:	xor    %r9d,%r9d
   938ba:	vpxor  %xmm7,%xmm7,%xmm7
   938be:	vpbroadcastb -0x8a041(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   938c7:	vpbroadcastb -0x8a049(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   938d0:	vpbroadcastb -0x8a051(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   938d9:	vpbroadcastb -0x8a059(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   938e2:	vpbroadcastb -0x8a061(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   938eb:	vpbroadcastb -0x8a069(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   938f4:	vpbroadcastb -0x8a071(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   938fd:	vpbroadcastb -0x8a079(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   93906:	vpbroadcastb -0x8a081(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   9390f:	vpbroadcastb -0x8a089(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   93918:	jmp    92f1f <sessions::fast::parse_events_avx2+0x177f>
   9391d:	xor    %eax,%eax
   9391f:	xor    %r9d,%r9d
   93922:	vpxor  %xmm7,%xmm7,%xmm7
   93926:	vpbroadcastb -0x8a0a9(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   9392f:	vpbroadcastb -0x8a0b1(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   93938:	vpbroadcastb -0x8a0b9(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   93941:	vpbroadcastb -0x8a0c1(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   9394a:	vpbroadcastb -0x8a0c9(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   93953:	vpbroadcastb -0x8a0d1(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   9395c:	vpbroadcastb -0x8a0d9(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   93965:	vpbroadcastb -0x8a0e1(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   9396e:	vpbroadcastb -0x8a0e9(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   93977:	vpbroadcastb -0x8a0f1(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   93980:	jmp    930f4 <sessions::fast::parse_events_avx2+0x1954>
   93985:	xor    %eax,%eax
   93987:	xor    %r9d,%r9d
   9398a:	vpxor  %xmm7,%xmm7,%xmm7
   9398e:	vpbroadcastb -0x8a111(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   93997:	vpbroadcastb -0x8a119(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   939a0:	vpbroadcastb -0x8a121(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   939a9:	vpbroadcastb -0x8a129(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   939b2:	vpbroadcastb -0x8a131(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   939bb:	vpbroadcastb -0x8a139(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   939c4:	vpbroadcastb -0x8a141(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   939cd:	vpbroadcastb -0x8a149(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   939d6:	vpbroadcastb -0x8a151(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   939df:	vpbroadcastb -0x8a159(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   939e8:	mov    0x28(%rsp),%r11
   939ed:	mov    %rbp,%r10
   939f0:	jmp    927c7 <sessions::fast::parse_events_avx2+0x1027>
   939f5:	xor    %ecx,%ecx
   939f7:	vpxor  %xmm7,%xmm7,%xmm7
   939fb:	vpbroadcastb -0x8a17e(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   93a04:	vpbroadcastb -0x8a186(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   93a0d:	vpbroadcastb -0x8a18e(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   93a16:	vpbroadcastb -0x8a196(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   93a1f:	vpbroadcastb -0x8a19e(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   93a28:	vpbroadcastb -0x8a1a6(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   93a31:	vpbroadcastb -0x8a1ae(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   93a3a:	vpbroadcastb -0x8a1b6(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   93a43:	vpbroadcastb -0x8a1be(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   93a4c:	vpbroadcastb -0x8a1c6(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   93a55:	mov    0x28(%rsp),%r11
   93a5a:	mov    0x78(%rsp),%r9
   93a5f:	mov    0x50(%rsp),%r10
   93a64:	vmovdqu 0x160(%rsp),%ymm0
   93a6d:	movzbl 0xd0(%rsp),%esi
   93a75:	movzbl 0xf0(%rsp),%eax
   93a7d:	mov    %rbp,%rdi
   93a80:	mov    (%rsp),%rbp
   93a84:	jmp    92fee <sessions::fast::parse_events_avx2+0x184e>
   93a89:	mov    (%rsp),%rax
   93a8d:	mov    0x28(%rax),%rsi
   93a91:	cmp    %rsi,%rdi
   93a94:	jae    95f92 <sessions::fast::parse_events_avx2+0x47f2>
   93a9a:	mov    (%rsp),%rax
   93a9e:	mov    0x20(%rax),%rax
   93aa2:	mov    (%rax,%rdi,4),%r9d
   93aa6:	cmp    %rdx,%r8
   93aa9:	je     93ab6 <sessions::fast::parse_events_avx2+0x2316>
   93aab:	mov    (%rsp),%rax
   93aaf:	mov    0x918(%rax),%r9d
   93ab6:	mov    %r9,%rdx
   93ab9:	shl    $0x18,%edx
   93abc:	or     0x40(%rsp),%edx
   93ac0:	mov    0xb8(%rsp),%r12
   93ac8:	vpxor  %xmm7,%xmm7,%xmm7
   93acc:	vpbroadcastb -0x8a24f(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   93ad5:	vpbroadcastb -0x8a257(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   93ade:	vpbroadcastb -0x8a25f(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   93ae7:	vpbroadcastb -0x8a267(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   93af0:	vpbroadcastb -0x8a26f(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   93af9:	vpbroadcastb -0x8a277(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   93b02:	vpbroadcastb -0x8a27f(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   93b0b:	vpbroadcastb -0x8a287(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   93b14:	vpbroadcastb -0x8a28f(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   93b1d:	vpbroadcastb -0x8a297(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   93b26:	mov    (%rsp),%rcx
   93b2a:	mov    0x8(%rsp),%rbx
   93b2f:	mov    0x28(%rsp),%r11
   93b34:	mov    0x78(%rsp),%r9
   93b39:	mov    0x50(%rsp),%r10
   93b3e:	vmovdqu 0x160(%rsp),%ymm0
   93b47:	movzbl 0xd0(%rsp),%esi
   93b4f:	movzbl 0xf0(%rsp),%eax
   93b57:	mov    %rbp,%rdi
   93b5a:	mov    %rcx,%rbp
   93b5d:	mov    %rdx,%rcx
   93b60:	jmp    92fee <sessions::fast::parse_events_avx2+0x184e>
   93b65:	add    0x20(%rsp),%rdi
   93b6a:	call   a2020 <sessions::fast::keys::lookup_exotic>
   93b6f:	cmp    $0x1,%rax
   93b73:	je     93306 <sessions::fast::parse_events_avx2+0x1b66>
   93b79:	jmp    93aab <sessions::fast::parse_events_avx2+0x230b>
   93b7e:	mov    %rdi,%rbp
   93b81:	add    0x20(%rsp),%r10
   93b86:	mov    %r10,%rdi
   93b89:	mov    %r9,%rsi
   93b8c:	mov    %r11,%r13
   93b8f:	vzeroupper
   93b92:	call   a1950 <sessions::fast::keys::intern_exotic>
   93b97:	mov    %r13,%r11
   93b9a:	mov    (%rsp),%r8
   93b9e:	vpbroadcastb -0x8a318(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   93ba7:	vpbroadcastb -0x8a322(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   93bb0:	vpbroadcastb -0x8a32c(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   93bb9:	vpbroadcastb -0x8a336(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   93bc2:	vpbroadcastb -0x8a340(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   93bcb:	vpbroadcastb -0x8a34a(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   93bd4:	vpbroadcastb -0x8a354(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   93bdd:	vpbroadcastb -0x8a35e(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   93be6:	vpbroadcastb -0x8a368(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   93bef:	vpbroadcastb -0x8a372(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   93bf8:	vpxor  %xmm7,%xmm7,%xmm7
   93bfc:	jmp    93029 <sessions::fast::parse_events_avx2+0x1889>
   93c01:	data16 data16 data16 data16 data16 cs nopw 0x0(%rax,%rax,1)
   93c10:	mov    %r8d,(%r14,%r15,4)
   93c14:	mov    %r13d,(%r12,%r15,4)
   93c18:	mov    0x70(%rsp),%r11
   93c1d:	mov    %ebp,(%r11,%r15,4)
   93c21:	inc    %r15
   93c24:	test   %r15,%r15
   93c27:	jne    91c5d <sessions::fast::parse_events_avx2+0x4bd>
   93c2d:	mov    0x188(%rsp),%rax
   93c35:	sub    0xc8(%rsp),%rax
   93c3d:	inc    %rax
   93c40:	xor    %ebx,%ebx
   93c42:	mov    0xe8(%rsp),%r15
   93c4a:	nopw   0x0(%rax,%rax,1)
   93c50:	cmpb   $0xa,(%rdi,%rbx,1)
   93c54:	je     93c63 <sessions::fast::parse_events_avx2+0x24c3>
   93c56:	inc    %rbx
   93c59:	cmp    %rbx,%rax
   93c5c:	jne    93c50 <sessions::fast::parse_events_avx2+0x24b0>
   93c5e:	mov    0x30(%rsp),%rbx
   93c63:	mov    %rbx,%rsi
   93c66:	lea    0x118(%rsp),%rdx
   93c6e:	vzeroupper
   93c71:	call   3b650 <sessions::fast::scan::long_line::<7, sessions::fast::EventLines<sessions::fast::scan::Avx2>>>
   93c76:	mov    0xc8(%rsp),%rax
   93c7e:	add    %rbx,%rax
   93c81:	inc    %rax
   93c84:	vpxor  %xmm7,%xmm7,%xmm7
   93c88:	vpbroadcastb -0x8a40b(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   93c91:	vpbroadcastb -0x8a413(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   93c9a:	vpbroadcastb -0x8a41b(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   93ca3:	vpbroadcastb -0x8a423(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   93cac:	vpbroadcastb -0x8a42b(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   93cb5:	vpbroadcastb -0x8a433(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   93cbe:	vpbroadcastb -0x8a43b(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   93cc7:	vpbroadcastb -0x8a443(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   93cd0:	vpbroadcastb -0x8a44b(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   93cd9:	vpbroadcastb -0x8a453(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   93ce2:	cmp    %r15,%rax
   93ce5:	mov    0xf8(%rsp),%rdx
   93ced:	jb     91931 <sessions::fast::parse_events_avx2+0x191>
   93cf3:	mov    0x190(%rsp),%r14
   93cfb:	sub    %r15,%rdx
   93cfe:	jbe    95f5c <sessions::fast::parse_events_avx2+0x47bc>
   93d04:	mov    %rdx,%rbx
   93d07:	add    $0xa0,%rbx
   93d0e:	jns    93d18 <sessions::fast::parse_events_avx2+0x2578>
   93d10:	vzeroupper
   93d13:	call   b2da0 <alloc::raw_vec::capacity_overflow>
   93d18:	mov    %r15,%r12
   93d1b:	mov    %rdx,0xf8(%rsp)
   93d23:	mov    0x108(%rsp),%r15
   93d2b:	mov    %rbx,%rdi
   93d2e:	vzeroupper
   93d31:	call   *0xebc89(%rip)        # 17f9c0 <malloc@GLIBC_2.2.5>
   93d37:	test   %rax,%rax
   93d3a:	je     95f79 <sessions::fast::parse_events_avx2+0x47d9>
   93d40:	mov    %rax,%rbp
   93d43:	mov    %r15,%rsi
   93d46:	add    %r12,%rsi
   93d49:	mov    %rax,%rdi
   93d4c:	mov    0xf8(%rsp),%rbx
   93d54:	mov    %rbx,%rdx
   93d57:	call   *0xebc53(%rip)        # 17f9b0 <memcpy@GLIBC_2.14>
   93d5d:	vpxor  %xmm7,%xmm7,%xmm7
   93d61:	vmovdqu %ymm7,0x0(%rbp,%rbx,1)
   93d67:	vmovdqu %ymm7,0x20(%rbp,%rbx,1)
   93d6d:	vmovdqu %ymm7,0x40(%rbp,%rbx,1)
   93d73:	vmovdqu %ymm7,0x60(%rbp,%rbx,1)
   93d79:	vmovdqu %ymm7,0x80(%rbp,%rbx,1)
   93d82:	mov    %r14,%rax
   93d85:	mov    0x8(%r14),%rcx
   93d89:	mov    0x20(%r14),%r13
   93d8d:	mov    0x38(%r14),%r14
   93d91:	mov    0x50(%rax),%r11
   93d95:	mov    %rcx,0x88(%rsp)
   93d9d:	lea    0x40(%rcx),%rax
   93da1:	mov    %rax,0xf0(%rsp)
   93da9:	xor    %eax,%eax
   93dab:	vpbroadcastb -0x8a52e(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   93db4:	vpbroadcastb -0x8a536(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   93dbd:	vpbroadcastb -0x8a53e(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   93dc6:	vpbroadcastb -0x8a546(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   93dcf:	vpbroadcastb -0x8a54e(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   93dd8:	vpbroadcastb -0x8a556(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   93de1:	vpbroadcastb -0x8a55e(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   93dea:	vpbroadcastb -0x8a566(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   93df3:	vpbroadcastb -0x8a56e(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   93dfc:	vpbroadcastb -0x8a576(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   93e05:	mov    %r13,0xb8(%rsp)
   93e0d:	mov    %r14,0xe0(%rsp)
   93e15:	mov    %rbp,0xe8(%rsp)
   93e1d:	mov    %r11,0x10(%rsp)
   93e22:	jmp    93e6e <sessions::fast::parse_events_avx2+0x26ce>
   93e24:	data16 data16 cs nopw 0x0(%rax,%rax,1)
   93e30:	mov    0x8(%rsp),%rax
   93e35:	mov    %rax,0x130(%rsp)
   93e3d:	mov    %ebx,%eax
   93e3f:	mov    0xc8(%rsp),%rcx
   93e47:	add    %rax,%rcx
   93e4a:	mov    %rcx,%rax
   93e4d:	mov    0xe8(%rsp),%rbp
   93e55:	mov    0xe0(%rsp),%r14
   93e5d:	mov    0xf8(%rsp),%rbx
   93e65:	cmp    %rbx,%rax
   93e68:	jae    95f42 <sessions::fast::parse_events_avx2+0x47a2>
   93e6e:	mov    %rbx,%rcx
   93e71:	sub    %rax,%rcx
   93e74:	cmp    $0x8000,%rcx
   93e7b:	mov    $0x8000,%r10d
   93e81:	cmovb  %rcx,%r10
   93e85:	lea    (%rax,%rbp,1),%rdi
   93e89:	mov    %rcx,0x30(%rsp)
   93e8e:	test   %rcx,%rcx
   93e91:	mov    %rdi,0x40(%rsp)
   93e96:	mov    %rax,0xc8(%rsp)
   93e9e:	je     94160 <sessions::fast::parse_events_avx2+0x29c0>
   93ea4:	mov    $0xffffffffffffffff,%rax
   93eab:	shlx   %r10,%rax,%rax
   93eb0:	not    %rax
   93eb3:	mov    %rax,0x20(%rsp)
   93eb8:	xor    %r11d,%r11d
   93ebb:	xor    %edx,%edx
   93ebd:	xor    %ebp,%ebp
   93ebf:	xor    %r12d,%r12d
   93ec2:	mov    %r10,0x70(%rsp)
   93ec7:	jmp    93f02 <sessions::fast::parse_events_avx2+0x2762>
   93ec9:	nopl   0x0(%rax)
   93ed0:	add    %r10,%r11
   93ed3:	popcnt %r9,%rax
   93ed8:	add    %eax,%edx
   93eda:	mov    0x70(%rsp),%r10
   93edf:	mov    0x60(%rsp),%r12
   93ee4:	cmp    %r10,%r12
   93ee7:	mov    0xb8(%rsp),%r13
   93eef:	mov    0xe0(%rsp),%r14
   93ef7:	mov    0x40(%rsp),%rdi
   93efc:	jae    94140 <sessions::fast::parse_events_avx2+0x29a0>
   93f02:	vmovdqu (%rdi,%r12,1),%ymm0
   93f08:	vmovdqu 0x20(%rdi,%r12,1),%ymm1
   93f0f:	vpcmpeqb %ymm4,%ymm0,%ymm2
   93f13:	vpmovmskb %ymm2,%r8d
   93f17:	vpcmpeqb %ymm4,%ymm1,%ymm2
   93f1b:	vpmovmskb %ymm2,%ebx
   93f1f:	shl    $0x20,%rbx
   93f23:	or     %r8,%rbx
   93f26:	vpcmpeqb %ymm5,%ymm0,%ymm2
   93f2a:	vpmovmskb %ymm2,%r8d
   93f2e:	vpcmpeqb %ymm5,%ymm1,%ymm2
   93f32:	vpmovmskb %ymm2,%eax
   93f36:	shl    $0x20,%rax
   93f3a:	or     %r8,%rax
   93f3d:	vpcmpeqb %ymm6,%ymm0,%ymm0
   93f41:	vpmovmskb %ymm0,%r8d
   93f45:	vpcmpeqb %ymm6,%ymm1,%ymm0
   93f49:	vpmovmskb %ymm0,%r9d
   93f4d:	shl    $0x20,%r9
   93f51:	or     %r8,%r9
   93f54:	lea    0x40(%r12),%rcx
   93f59:	mov    %rcx,0x60(%rsp)
   93f5e:	cmp    %r10,%rcx
   93f61:	mov    $0xffffffffffffffff,%r15
   93f68:	cmova  0x20(%rsp),%r15
   93f6e:	mov    %r11,%r10
   93f71:	and    %r15,%r9
   93f74:	and    %r15,%rbx
   93f77:	and    %rax,%r15
   93f7a:	mov    0x10(%rsp),%r8
   93f7f:	je     93fc8 <sessions::fast::parse_events_avx2+0x2828>
   93f81:	data16 data16 data16 data16 data16 cs nopw 0x0(%rax,%rax,1)
   93f90:	tzcnt  %r15,%rax
   93f95:	bzhi   %rax,%rbx,%rcx
   93f9a:	bzhi   %rax,%r9,%rsi
   93f9f:	or     %r12d,%eax
   93fa2:	mov    %eax,0x0(%r13,%rbp,4)
   93fa7:	popcnt %rcx,%rax
   93fac:	add    %r10d,%eax
   93faf:	mov    %eax,(%r14,%rbp,4)
   93fb3:	popcnt %rsi,%rax
   93fb8:	add    %edx,%eax
   93fba:	mov    %eax,(%r8,%rbp,4)
   93fbe:	inc    %rbp
   93fc1:	blsr   %r15,%r15
   93fc6:	jne    93f90 <sessions::fast::parse_events_avx2+0x27f0>
   93fc8:	blsr   %rbx,%rax
   93fcd:	blsr   %rax,%r11
   93fd2:	blsr   %r11,%r14
   93fd7:	blsr   %r14,%rdi
   93fdc:	blsr   %rdi,%rsi
   93fe1:	blsr   %rsi,%r13
   93fe6:	blsr   %r13,%r15
   93feb:	tzcnt  %r15,%rcx
   93ff0:	tzcnt  %r13,%r13
   93ff5:	tzcnt  %rsi,%rsi
   93ffa:	tzcnt  %r14,%r14
   93fff:	tzcnt  %r11,%r11
   94004:	tzcnt  %rax,%rax
   94009:	tzcnt  %rbx,%r8
   9400e:	vmovd  %r8d,%xmm0
   94013:	vpinsrd $0x1,%eax,%xmm0,%xmm0
   94019:	vpinsrd $0x2,%r11d,%xmm0,%xmm0
   9401f:	vpinsrd $0x3,%r14d,%xmm0,%xmm0
   94025:	tzcnt  %rdi,%rax
   9402a:	vmovd  %eax,%xmm1
   9402e:	vpinsrd $0x1,%esi,%xmm1,%xmm1
   94034:	vpinsrd $0x2,%r13d,%xmm1,%xmm1
   9403a:	vpinsrd $0x3,%ecx,%xmm1,%xmm1
   94040:	vinserti128 $0x1,%xmm1,%ymm0,%ymm1
   94046:	vmovd  %r12d,%xmm0
   9404b:	vpbroadcastd %xmm0,%ymm0
   94050:	vpaddd %ymm0,%ymm1,%ymm1
   94054:	mov    0x88(%rsp),%rax
   9405c:	vmovdqu %ymm1,(%rax,%r10,4)
   94062:	popcnt %rbx,%r11
   94067:	cmp    $0x9,%r11
   9406b:	jb     93ed0 <sessions::fast::parse_events_avx2+0x2730>
   94071:	blsr   %r15,%rax
   94076:	blsr   %rax,%rcx
   9407b:	blsr   %rcx,%rsi
   94080:	blsr   %rsi,%r8
   94085:	blsr   %r8,%rbx
   9408a:	blsr   %rbx,%r14
   9408f:	blsr   %r14,%r15
   94094:	blsr   %r15,%rdi
   94099:	tzcnt  %rdi,%r13
   9409e:	tzcnt  %r15,%r15
   940a3:	tzcnt  %r14,%r14
   940a8:	tzcnt  %r8,%r8
   940ad:	tzcnt  %rsi,%rsi
   940b2:	tzcnt  %rcx,%rcx
   940b7:	tzcnt  %rax,%rax
   940bc:	vmovd  %eax,%xmm1
   940c0:	vpinsrd $0x1,%ecx,%xmm1,%xmm1
   940c6:	vpinsrd $0x2,%esi,%xmm1,%xmm1
   940cc:	vpinsrd $0x3,%r8d,%xmm1,%xmm1
   940d2:	tzcnt  %rbx,%rax
   940d7:	vmovd  %eax,%xmm2
   940db:	vpinsrd $0x1,%r14d,%xmm2,%xmm2
   940e1:	vpinsrd $0x2,%r15d,%xmm2,%xmm2
   940e7:	vpinsrd $0x3,%r13d,%xmm2,%xmm2
   940ed:	vinserti128 $0x1,%xmm2,%ymm1,%ymm1
   940f3:	vpaddd %ymm0,%ymm1,%ymm0
   940f7:	mov    0x88(%rsp),%rax
   940ff:	vmovdqu %ymm0,0x20(%rax,%r10,4)
   94106:	blsr   %rdi,%rbx
   9410b:	je     93ed0 <sessions::fast::parse_events_avx2+0x2730>
   94111:	mov    0xf0(%rsp),%rax
   94119:	lea    (%rax,%r10,4),%r15
   9411d:	nopl   (%rax)
   94120:	tzcnt  %rbx,%rax
   94125:	or     %r12d,%eax
   94128:	mov    %eax,(%r15)
   9412b:	add    $0x4,%r15
   9412f:	blsr   %rbx,%rbx
   94134:	jne    94120 <sessions::fast::parse_events_avx2+0x2980>
   94136:	jmp    93ed0 <sessions::fast::parse_events_avx2+0x2730>
   9413b:	nopl   0x0(%rax,%rax,1)
   94140:	mov    0xf8(%rsp),%rbx
   94148:	mov    0xc8(%rsp),%rax
   94150:	lea    (%r10,%rax,1),%rsi
   94154:	cmp    %rbx,%rsi
   94157:	je     94170 <sessions::fast::parse_events_avx2+0x29d0>
   94159:	jmp    9417c <sessions::fast::parse_events_avx2+0x29dc>
   9415b:	nopl   0x0(%rax,%rax,1)
   94160:	xor    %ebp,%ebp
   94162:	xor    %edx,%edx
   94164:	xor    %r11d,%r11d
   94167:	lea    (%r10,%rax,1),%rsi
   9416b:	cmp    %rbx,%rsi
   9416e:	jne    9417c <sessions::fast::parse_events_avx2+0x29dc>
   94170:	cmpb   $0xa,-0x1(%rdi,%r10,1)
   94176:	jne    95e70 <sessions::fast::parse_events_avx2+0x46d0>
   9417c:	mov    0x10(%rsp),%r11
   94181:	test   %rbp,%rbp
   94184:	je     95e8e <sessions::fast::parse_events_avx2+0x46ee>
   9418a:	mov    0x130(%rsp),%rax
   94192:	mov    %rax,0x8(%rsp)
   94197:	mov    0x118(%rsp),%rax
   9419f:	mov    %rax,0x80(%rsp)
   941a7:	mov    0x120(%rsp),%rax
   941af:	mov    %rax,0x108(%rsp)
   941b7:	mov    0x128(%rsp),%rdi
   941bf:	xor    %ebx,%ebx
   941c1:	xor    %r15d,%r15d
   941c4:	xor    %esi,%esi
   941c6:	xor    %r10d,%r10d
   941c9:	mov    %rdi,0xd0(%rsp)
   941d1:	jmp    941ee <sessions::fast::parse_events_avx2+0x2a4e>
   941d3:	mov    0x4c(%rsp),%esi
   941d7:	nopw   0x0(%rax,%rax,1)
   941e0:	inc    %r15
   941e3:	inc    %ebx
   941e5:	cmp    %rbp,%r15
   941e8:	je     93e30 <sessions::fast::parse_events_avx2+0x2690>
   941ee:	mov    %r10d,%r8d
   941f1:	mov    %esi,%ecx
   941f3:	mov    %ebx,%r14d
   941f6:	mov    0x0(%r13,%r15,4),%ebx
   941fb:	mov    0xe0(%rsp),%rax
   94203:	mov    (%rax,%r15,4),%esi
   94207:	mov    (%r11,%r15,4),%r10d
   9420b:	cmp    %r14d,%ebx
   9420e:	jbe    941e0 <sessions::fast::parse_events_avx2+0x2a40>
   94210:	mov    %esi,%edx
   94212:	sub    %ecx,%edx
   94214:	cmp    $0x6,%edx
   94217:	jne    941e0 <sessions::fast::parse_events_avx2+0x2a40>
   94219:	mov    %esi,0x4c(%rsp)
   9421d:	mov    %ecx,%edx
   9421f:	mov    %r10d,0x70(%rsp)
   94224:	mov    0x88(%rsp),%r10
   9422c:	vmovdqu (%r10,%rdx,4),%xmm8
   94232:	mov    0xc(%r10,%rdx,4),%esi
   94237:	mov    0x8(%r10,%rdx,4),%edi
   9423c:	mov    (%r10,%rdx,4),%r11d
   94240:	mov    0x4(%r10,%rdx,4),%r9d
   94245:	lea    0x1(%r11),%eax
   94249:	mov    %eax,0x30(%rsp)
   9424d:	lea    0x1(%r9),%r12d
   94251:	lea    0x1(%rdi),%eax
   94254:	mov    %eax,0x60(%rsp)
   94258:	lea    0x1(%rsi),%eax
   9425b:	mov    %eax,0x58(%rsp)
   9425f:	mov    0x10(%r10,%rdx,4),%eax
   94264:	lea    0x1(%rax),%ecx
   94267:	mov    %ecx,0x6c(%rsp)
   9426b:	mov    0x14(%r10,%rdx,4),%ecx
   94270:	mov    0x70(%rsp),%r10d
   94275:	lea    0x1(%rcx),%edx
   94278:	mov    %edx,0x20(%rsp)
   9427c:	mov    %r10d,%edx
   9427f:	sub    %r8d,%edx
   94282:	mov    %r12d,0x28(%rsp)
   94287:	jne    942c0 <sessions::fast::parse_events_avx2+0x2b20>
   94289:	mov    %rax,0xd8(%rsp)
   94291:	mov    %rcx,0xc0(%rsp)
   94299:	mov    %ebx,%r12d
   9429c:	mov    0x10(%rsp),%r11
   942a1:	mov    0x20(%rsp),%r9d
   942a6:	mov    0x60(%rsp),%eax
   942aa:	mov    0x30(%rsp),%ecx
   942ae:	vmovd  %xmm8,%esi
   942b2:	sub    %r14d,%esi
   942b5:	je     941d3 <sessions::fast::parse_events_avx2+0x2a33>
   942bb:	jmp    94502 <sessions::fast::parse_events_avx2+0x2d62>
   942c0:	mov    %r15,0x90(%rsp)
   942c8:	mov    %r14d,%r10d
   942cb:	mov    %r11d,%r8d
   942ce:	cmp    $0x1,%r11d
   942d2:	adc    $0xffffffffffffffff,%r8
   942d6:	mov    %r14d,0xc0(%rsp)
   942de:	vpinsrd $0x3,%r14d,%xmm8,%xmm0
   942e4:	vpshufd $0x93,%xmm0,%xmm0
   942e9:	mov    0x30(%rsp),%r11d
   942ee:	mov    %rbx,0x98(%rsp)
   942f6:	mov    %r9d,%ebx
   942f9:	cmp    $0x1,%r9d
   942fd:	adc    $0xffffffffffffffff,%rbx
   94301:	mov    %r12d,%r9d
   94304:	mov    %edi,%r15d
   94307:	cmp    $0x1,%edi
   9430a:	adc    $0xffffffffffffffff,%r15
   9430e:	mov    0x60(%rsp),%edi
   94312:	mov    %esi,%r12d
   94315:	cmp    $0x1,%esi
   94318:	adc    $0xffffffffffffffff,%r12
   9431c:	mov    0x40(%rsp),%r14
   94321:	movzbl (%r14,%r10,1),%r10d
   94326:	vmovd  %r10d,%xmm1
   9432b:	vpinsrb $0x1,(%r14,%r11,1),%xmm1,%xmm1
   94332:	vpinsrb $0x2,(%r14,%r9,1),%xmm1,%xmm1
   94339:	vpinsrb $0x3,(%r14,%rdi,1),%xmm1,%xmm1
   94340:	vpaddd -0x8b858(%rip),%xmm0,%xmm0        # 8af0 <__abi_tag+0x87f4>
   94348:	vmovdqa -0x8c380(%rip),%xmm3        # 7fd0 <__abi_tag+0x7cd4>
   94350:	vpcmpeqb %xmm3,%xmm1,%xmm1
   94354:	movzbl (%r14,%r8,1),%edi
   94359:	vmovd  %edi,%xmm2
   9435d:	vpinsrb $0x1,(%r14,%rbx,1),%xmm2,%xmm2
   94364:	vpinsrb $0x2,(%r14,%r15,1),%xmm2,%xmm2
   9436b:	vpinsrb $0x3,(%r14,%r12,1),%xmm2,%xmm2
   94372:	vpcmpeqb %xmm3,%xmm2,%xmm2
   94376:	vpand  %xmm2,%xmm1,%xmm1
   9437a:	vpmaxud %xmm0,%xmm8,%xmm0
   9437f:	vpcmpeqd %xmm0,%xmm8,%xmm0
   94383:	vpmovsxbd %xmm1,%xmm1
   94388:	vpand  %xmm0,%xmm1,%xmm0
   9438c:	vpsrld $0x1f,%xmm0,%xmm1
   94391:	vmovd  %xmm1,%r10d
   94396:	vpextrd $0x1,%xmm1,%r8d
   9439c:	vpextrd $0x2,%xmm1,%edi
   943a2:	vpextrd $0x3,%xmm1,%r9d
   943a8:	mov    %r8,0xd8(%rsp)
   943b0:	mov    %r10,(%rsp)
   943b4:	lea    (%rdi,%r9,1),%r11d
   943b8:	add    %r10d,%r11d
   943bb:	add    %r8d,%r11d
   943be:	mov    0x58(%rsp),%ebx
   943c2:	movzbl (%r14,%rbx,1),%ebx
   943c7:	xor    $0x22,%bl
   943ca:	cmp    $0x1,%rax
   943ce:	mov    %rax,%r15
   943d1:	adc    $0xffffffffffffffff,%r15
   943d5:	movzbl (%r14,%r15,1),%r15d
   943da:	xor    $0x22,%r15b
   943de:	add    $0x3,%esi
   943e1:	cmp    %esi,%eax
   943e3:	setae  %sil
   943e7:	or     %bl,%r15b
   943ea:	sete   %bl
   943ed:	and    %sil,%bl
   943f0:	movzbl %bl,%esi
   943f3:	mov    0x6c(%rsp),%r13d
   943f8:	mov    %r13d,%ebx
   943fb:	movzbl (%r14,%rbx,1),%ebx
   94400:	xor    $0x22,%bl
   94403:	cmp    $0x1,%rcx
   94407:	mov    %rcx,%r15
   9440a:	adc    $0xffffffffffffffff,%r15
   9440e:	movzbl (%r14,%r15,1),%r15d
   94413:	xor    $0x22,%r15b
   94417:	lea    0x3(%rax),%r12d
   9441b:	cmp    %r12d,%ecx
   9441e:	setae  %r12b
   94422:	or     %bl,%r15b
   94425:	sete   %bl
   94428:	and    %r12b,%bl
   9442b:	movzbl %bl,%ebx
   9442e:	mov    0x20(%rsp),%r15d
   94433:	movzbl (%r14,%r15,1),%r15d
   94438:	xor    $0x22,%r15b
   9443c:	mov    0x98(%rsp),%r8
   94444:	movzbl -0x1(%r14,%r8,1),%r12d
   9444a:	xor    $0x22,%r12b
   9444e:	lea    0x3(%rcx),%r14d
   94452:	mov    %r8,%r10
   94455:	cmp    %r14d,%r8d
   94458:	setae  %r14b
   9445c:	or     %r15b,%r12b
   9445f:	lea    (%rsi,%rbx,1),%r12d
   94463:	sete   %r15b
   94467:	and    %r14b,%r15b
   9446a:	movzbl %r15b,%r15d
   9446e:	add    %r15d,%r12d
   94471:	add    %r11d,%r12d
   94474:	add    %r12d,%r12d
   94477:	cmp    %edx,%r12d
   9447a:	jne    9482d <sessions::fast::parse_events_avx2+0x308d>
   94480:	mov    0xc0(%rsp),%r14d
   94488:	add    (%rsp),%r14d
   9448c:	mov    0x30(%rsp),%edx
   94490:	add    0xd8(%rsp),%edx
   94497:	add    %edi,0x28(%rsp)
   9449b:	mov    0x60(%rsp),%edi
   9449f:	add    %r9d,%edi
   944a2:	add    %esi,0x58(%rsp)
   944a6:	sub    %esi,%eax
   944a8:	mov    %rax,0xd8(%rsp)
   944b0:	add    %ebx,%r13d
   944b3:	mov    %r13d,0x6c(%rsp)
   944b8:	sub    %ebx,%ecx
   944ba:	mov    %rcx,0xc0(%rsp)
   944c2:	mov    0x20(%rsp),%r9d
   944c7:	add    %r15d,%r9d
   944ca:	mov    %r10d,%r12d
   944cd:	sub    %r15d,%r12d
   944d0:	vpaddd %xmm0,%xmm8,%xmm8
   944d4:	mov    0xb8(%rsp),%r13
   944dc:	mov    0x10(%rsp),%r11
   944e1:	mov    %r10,%rbx
   944e4:	mov    0x90(%rsp),%r15
   944ec:	mov    0x70(%rsp),%r10d
   944f1:	mov    %edi,%eax
   944f3:	mov    %edx,%ecx
   944f5:	vmovd  %xmm8,%esi
   944f9:	sub    %r14d,%esi
   944fc:	je     941d3 <sessions::fast::parse_events_avx2+0x2a33>
   94502:	mov    %eax,0x60(%rsp)
   94506:	mov    %r14d,%edi
   94509:	vmovdqa %xmm8,0x30(%rsp)
   9450f:	vpextrd $0x1,%xmm8,%eax
   94515:	mov    %eax,0x138(%rsp)
   9451c:	mov    %eax,%r10d
   9451f:	sub    %ecx,%r10d
   94522:	cmp    $0xb,%rsi
   94526:	mov    $0xb,%eax
   9452b:	cmovb  %rsi,%rax
   9452f:	cmp    $0xb,%r10
   94533:	mov    $0xb,%edx
   94538:	cmovb  %r10,%rdx
   9453c:	mov    %ecx,%r8d
   9453f:	mov    0x40(%rsp),%rcx
   94544:	vmovdqu (%rcx,%rdi,1),%xmm0
   94549:	mov    %r8,0x110(%rsp)
   94551:	vinserti128 $0x1,(%rcx,%r8,1),%ymm0,%ymm0
   94558:	vmovd  %eax,%xmm1
   9455c:	vmovd  %edx,%xmm2
   94560:	vinserti128 $0x1,%xmm2,%ymm1,%ymm1
   94566:	vpaddb %ymm0,%ymm9,%ymm2
   9456a:	vpminub %ymm2,%ymm10,%ymm3
   9456e:	vpcmpeqb %ymm3,%ymm2,%ymm2
   94572:	vpaddb %ymm0,%ymm11,%ymm3
   94576:	vpminub %ymm3,%ymm12,%ymm4
   9457a:	vpcmpeqb %ymm4,%ymm3,%ymm3
   9457e:	vpaddb %ymm0,%ymm13,%ymm4
   94582:	vpminub %ymm4,%ymm12,%ymm5
   94586:	vpcmpeqb %ymm5,%ymm4,%ymm4
   9458a:	vpaddb %ymm0,%ymm15,%ymm5
   9458e:	vpand  %ymm5,%ymm2,%ymm5
   94592:	vpaddb -0x8ae9a(%rip),%ymm0,%ymm6        # 9700 <__abi_tag+0x9404>
   9459a:	vpand  %ymm6,%ymm3,%ymm6
   9459e:	vpor   %ymm6,%ymm5,%ymm5
   945a2:	vpor   %ymm2,%ymm3,%ymm2
   945a6:	vpcmpeqb %ymm0,%ymm14,%ymm3
   945aa:	vpaddb -0x8ae52(%rip),%ymm0,%ymm0        # 9760 <__abi_tag+0x9464>
   945b2:	vpand  %ymm0,%ymm4,%ymm0
   945b6:	vpor   %ymm4,%ymm3,%ymm4
   945ba:	vpor   %ymm2,%ymm4,%ymm2
   945be:	vpshufb %ymm7,%ymm1,%ymm1
   945c3:	vpcmpgtb -0x8af4b(%rip),%ymm1,%ymm1        # 9680 <__abi_tag+0x9384>
   945cb:	vpandn %ymm1,%ymm2,%ymm2
   945cf:	vpsllw $0x7,%ymm2,%ymm2
   945d4:	vpmovmskb %ymm2,%eax
   945d8:	vpand  -0x8aea0(%rip),%ymm3,%ymm2        # 9740 <__abi_tag+0x9444>
   945e0:	vpor   %ymm2,%ymm0,%ymm0
   945e4:	vpor   %ymm5,%ymm0,%ymm0
   945e8:	vpand  %ymm0,%ymm1,%ymm0
   945ec:	vpmaddubsw -0x8adf5(%rip),%ymm0,%ymm0        # 9800 <__abi_tag+0x9504>
   945f5:	vpmaddwd -0x8adbd(%rip),%ymm0,%ymm0        # 9840 <__abi_tag+0x9544>
   945fd:	cmp    $0xb,%r10d
   94601:	setb   %r8b
   94605:	cmp    $0x10000,%eax
   9460a:	setb   0x50(%rsp)
   9460f:	cmp    $0xa,%esi
   94612:	mov    %rbx,0x98(%rsp)
   9461a:	mov    %r8b,0x100(%rsp)
   94622:	ja     95780 <sessions::fast::parse_events_avx2+0x3fe0>
   94628:	movzwl %ax,%eax
   9462b:	test   %eax,%eax
   9462d:	jne    95780 <sessions::fast::parse_events_avx2+0x3fe0>
   94633:	vpextrd $0x1,%xmm0,%edx
   94639:	vmovd  %xmm0,%ecx
   9463d:	vpextrd $0x2,%xmm0,%eax
   94643:	shl    $0x24,%rcx
   94647:	shl    $0xc,%rdx
   9464b:	or     %rcx,%rdx
   9464e:	shr    $0xc,%eax
   94651:	or     %rdx,%rax
   94654:	mov    0x60(%rsp),%edi
   94658:	mov    %edi,%ebx
   9465a:	vmovdqa 0x30(%rsp),%xmm1
   94660:	vpextrd $0x3,%xmm1,%esi
   94666:	add    0x40(%rsp),%rbx
   9466b:	mov    %esi,%ecx
   9466d:	sub    %edi,%ecx
   9466f:	cmp    $0x19,%rcx
   94673:	vpbroadcastb -0x8adef(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   9467c:	vpbroadcastb -0x8adf7(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   94685:	vpbroadcastb -0x8adff(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   9468e:	mov    %r15,0x90(%rsp)
   94696:	mov    %rax,(%rsp)
   9469a:	mov    %r12,0x78(%rsp)
   9469f:	je     94842 <sessions::fast::parse_events_avx2+0x30a2>
   946a5:	cmp    $0x14,%ecx
   946a8:	jne    94a86 <sessions::fast::parse_events_avx2+0x32e6>
   946ae:	cmpb   $0x5a,0x13(%rbx)
   946b2:	jne    94b85 <sessions::fast::parse_events_avx2+0x33e5>
   946b8:	mov    %r9d,0x20(%rsp)
   946bd:	mov    %r10,0x60(%rsp)
   946c2:	mov    (%rbx),%rdx
   946c5:	mov    0x80(%rsp),%rsi
   946cd:	mov    0x8e0(%rsi),%rax
   946d4:	imul   %rdx,%rax
   946d8:	shr    $0x3c,%rax
   946dc:	cmp    %rdx,0x698(%rsi,%rax,8)
   946e4:	jne    9597d <sessions::fast::parse_events_avx2+0x41dd>
   946ea:	mov    0x718(%rsi,%rax,8),%rcx
   946f2:	mov    0x798(%rsi,%rax,8),%rdx
   946fa:	movzwl 0x8(%rbx),%esi
   946fe:	xor    $0x3030,%rsi
   94705:	mov    0xb(%rbx),%rdi
   94709:	mov    %rdi,%rax
   9470c:	movabs $0x3030303030303030,%r8
   94716:	xor    %r8,%rax
   94719:	lea    0x7676(%rsi),%r8d
   94720:	or     %esi,%r8d
   94723:	and    $0x8080,%r8d
   9472a:	movabs $0x7676767676767676,%r9
   94734:	add    %rax,%r9
   94737:	or     %rdi,%r9
   9473a:	movabs $0x8080008080008080,%r10
   94744:	and    %r10,%r9
   94747:	xor    %r10d,%r10d
   9474a:	cmpb   $0x54,0xa(%rbx)
   9474e:	setne  %r10b
   94752:	movabs $0xff0000ff0000,%r11
   9475c:	and    %r11,%rdi
   9475f:	or     %r10,%rdi
   94762:	or     %r9,%rdi
   94765:	or     %r8,%rdi
   94768:	mov    $0xffffffff,%r12d
   9476e:	movabs $0x3a00003a0000,%r8
   94778:	cmp    %r8,%rdi
   9477b:	jne    94b5b <sessions::fast::parse_events_avx2+0x33bb>
   94781:	lea    (%rax,%rax,4),%rdi
   94785:	shr    $0x8,%rax
   94789:	lea    (%rax,%rdi,2),%r9
   9478d:	mov    %r9,%rax
   94790:	shr    $0x30,%rax
   94794:	movzbl %al,%edi
   94797:	xor    %eax,%eax
   94799:	cmp    $0x3b,%rdi
   9479d:	mov    0x10(%rsp),%r11
   947a2:	ja     94c6c <sessions::fast::parse_events_avx2+0x34cc>
   947a8:	mov    %r9d,%r8d
   947ab:	shr    $0x18,%r8d
   947af:	cmp    $0x3b,%r8d
   947b3:	ja     94c6c <sessions::fast::parse_events_avx2+0x34cc>
   947b9:	movzbl %r9b,%ebx
   947bd:	cmp    $0x17,%ebx
   947c0:	ja     94c6c <sessions::fast::parse_events_avx2+0x34cc>
   947c6:	movzbl %sil,%r10d
   947ca:	lea    (%r10,%r10,4),%r10
   947ce:	shr    $0x8,%esi
   947d1:	lea    (%rsi,%r10,2),%rsi
   947d5:	test   %rsi,%rsi
   947d8:	je     94c6c <sessions::fast::parse_events_avx2+0x34cc>
   947de:	movabs $0x7fffffffffffffff,%r10
   947e8:	mov    $0x0,%r9d
   947ee:	cmp    %rdx,%rsi
   947f1:	jg     94c79 <sessions::fast::parse_events_avx2+0x34d9>
   947f7:	add    %rcx,%rsi
   947fa:	imul   $0x15180,%rsi,%rax
   94801:	imul   $0xe10,%rbx,%rcx
   94808:	imul   $0x3c,%r8,%rdx
   9480c:	add    %rdi,%rcx
   9480f:	add    %rdx,%rcx
   94812:	add    %rax,%rcx
   94815:	imul   $0x3e8,%rcx,%r8
   9481c:	add    $0xfffffffffad9a400,%r8
   94823:	mov    0x60(%rsp),%r10
   94828:	jmp    94df4 <sessions::fast::parse_events_avx2+0x3654>
   9482d:	mov    0xb8(%rsp),%r13
   94835:	mov    0x10(%rsp),%r11
   9483a:	mov    %r10,%rbx
   9483d:	jmp    94d66 <sessions::fast::parse_events_avx2+0x35c6>
   94842:	movzbl 0x13(%rbx),%r14d
   94847:	cmp    $0x2b,%r14d
   9484b:	je     94857 <sessions::fast::parse_events_avx2+0x30b7>
   9484d:	cmp    $0x2d,%r14d
   94851:	jne    94b85 <sessions::fast::parse_events_avx2+0x33e5>
   94857:	mov    %r9d,0x20(%rsp)
   9485c:	mov    %r10,0x60(%rsp)
   94861:	mov    (%rbx),%rdx
   94864:	mov    0x80(%rsp),%rsi
   9486c:	mov    0x8e0(%rsi),%rax
   94873:	imul   %rdx,%rax
   94877:	shr    $0x3c,%rax
   9487b:	cmp    %rdx,0x698(%rsi,%rax,8)
   94883:	jne    958cd <sessions::fast::parse_events_avx2+0x412d>
   94889:	mov    0x718(%rsi,%rax,8),%rcx
   94891:	mov    0x798(%rsi,%rax,8),%rdi
   94899:	movzwl 0x8(%rbx),%r9d
   9489e:	xor    $0x3030,%r9
   948a5:	mov    0xb(%rbx),%rdx
   948a9:	mov    %rdx,%rax
   948ac:	movabs $0x3030303030303030,%rsi
   948b6:	xor    %rsi,%rax
   948b9:	lea    0x7676(%r9),%esi
   948c0:	or     %r9d,%esi
   948c3:	and    $0x8080,%esi
   948c9:	movabs $0x7676767676767676,%r8
   948d3:	add    %rax,%r8
   948d6:	or     %rdx,%r8
   948d9:	movabs $0x8080008080008080,%r10
   948e3:	and    %r10,%r8
   948e6:	xor    %r10d,%r10d
   948e9:	cmpb   $0x54,0xa(%rbx)
   948ed:	setne  %r10b
   948f1:	movabs $0xff0000ff0000,%r11
   948fb:	and    %r11,%rdx
   948fe:	or     %r10,%rdx
   94901:	or     %r8,%rdx
   94904:	or     %rsi,%rdx
   94907:	mov    $0xffffffff,%r12d
   9490d:	movabs $0x3a00003a0000,%rsi
   94917:	cmp    %rsi,%rdx
   9491a:	jne    94b5b <sessions::fast::parse_events_avx2+0x33bb>
   94920:	lea    (%rax,%rax,4),%rdx
   94924:	shr    $0x8,%rax
   94928:	lea    (%rax,%rdx,2),%r8
   9492c:	mov    %r8,%rax
   9492f:	shr    $0x30,%rax
   94933:	movzbl %al,%edx
   94936:	xor    %eax,%eax
   94938:	cmp    $0x3b,%rdx
   9493c:	mov    0x10(%rsp),%r11
   94941:	ja     94c6c <sessions::fast::parse_events_avx2+0x34cc>
   94947:	mov    %r8d,%esi
   9494a:	shr    $0x18,%esi
   9494d:	cmp    $0x3b,%esi
   94950:	ja     94c6c <sessions::fast::parse_events_avx2+0x34cc>
   94956:	movzbl %r8b,%r8d
   9495a:	cmp    $0x17,%r8d
   9495e:	ja     94c6c <sessions::fast::parse_events_avx2+0x34cc>
   94964:	mov    %rcx,0x30(%rsp)
   94969:	movzbl %r9b,%r10d
   9496d:	lea    (%r10,%r10,4),%r10
   94971:	shr    $0x8,%r9d
   94975:	lea    (%r9,%r10,2),%rcx
   94979:	test   %rcx,%rcx
   9497c:	je     94c6c <sessions::fast::parse_events_avx2+0x34cc>
   94982:	cmp    %rdi,%rcx
   94985:	jg     94c6c <sessions::fast::parse_events_avx2+0x34cc>
   9498b:	cmpb   $0x3a,0x16(%rbx)
   9498f:	jne    94c6a <sessions::fast::parse_events_avx2+0x34ca>
   94995:	movzbl 0x14(%rbx),%edi
   94999:	add    $0xd0,%dil
   9499d:	xor    %eax,%eax
   9499f:	cmp    $0x9,%dil
   949a3:	ja     94c6c <sessions::fast::parse_events_avx2+0x34cc>
   949a9:	movzbl 0x15(%rbx),%r10d
   949ae:	add    $0xd0,%r10b
   949b2:	cmp    $0x9,%r10b
   949b6:	ja     94c6c <sessions::fast::parse_events_avx2+0x34cc>
   949bc:	movzbl 0x17(%rbx),%r15d
   949c1:	add    $0xd0,%r15b
   949c5:	cmp    $0x9,%r15b
   949c9:	ja     94c6c <sessions::fast::parse_events_avx2+0x34cc>
   949cf:	movzbl 0x18(%rbx),%r11d
   949d4:	add    $0xd0,%r11b
   949d8:	cmp    $0x9,%r11b
   949dc:	ja     94b5d <sessions::fast::parse_events_avx2+0x33bd>
   949e2:	movzbl %dil,%eax
   949e6:	add    %eax,%eax
   949e8:	lea    (%rax,%rax,4),%edi
   949eb:	add    %r10b,%dil
   949ee:	xor    %eax,%eax
   949f0:	cmp    $0x17,%dil
   949f4:	ja     94b5d <sessions::fast::parse_events_avx2+0x33bd>
   949fa:	movzbl %r15b,%r10d
   949fe:	add    %r10d,%r10d
   94a01:	lea    (%r10,%r10,4),%ebx
   94a05:	add    %r11b,%bl
   94a08:	movabs $0x7fffffffffffffff,%r10
   94a12:	mov    $0x0,%r9d
   94a18:	cmp    $0x3b,%bl
   94a1b:	mov    0x10(%rsp),%r11
   94a20:	ja     94c79 <sessions::fast::parse_events_avx2+0x34d9>
   94a26:	add    0x30(%rsp),%rcx
   94a2b:	imul   $0x15180,%rcx,%rax
   94a32:	imul   $0xe10,%r8,%rcx
   94a39:	imul   $0x3c,%rsi,%rsi
   94a3d:	add    %rdx,%rcx
   94a40:	add    %rsi,%rcx
   94a43:	add    %rax,%rcx
   94a46:	imul   $0x3e8,%rcx,%rax
   94a4d:	add    $0xfffffffffad9a400,%rax
   94a53:	movzbl %bl,%ecx
   94a56:	movzbl %dil,%edx
   94a5a:	imul   $0x36ee80,%rdx,%rdx
   94a61:	imul   $0xea60,%rcx,%rcx
   94a68:	add    %rdx,%rcx
   94a6b:	mov    %rcx,%r8
   94a6e:	neg    %r8
   94a71:	cmp    $0x2b,%r14b
   94a75:	cmovne %rcx,%r8
   94a79:	add    %rax,%r8
   94a7c:	mov    0x60(%rsp),%r10
   94a81:	jmp    94df4 <sessions::fast::parse_events_avx2+0x3654>
   94a86:	lea    -0x1(%rcx),%edx
   94a89:	cmp    $0x10,%edx
   94a8c:	jae    94b74 <sessions::fast::parse_events_avx2+0x33d4>
   94a92:	mov    %r9d,0x20(%rsp)
   94a97:	cmp    $0x9,%ecx
   94a9a:	movabs $0x7676767676767676,%r8
   94aa4:	movabs $0x3030303030303030,%r9
   94aae:	jae    94c02 <sessions::fast::parse_events_avx2+0x3462>
   94ab4:	mov    %r10,%rdi
   94ab7:	lea    0x0(,%rcx,8),%edx
   94abe:	xor    %eax,%eax
   94ac0:	cmp    $0x8,%rcx
   94ac4:	shrx   %rdx,%r9,%rdx
   94ac9:	cmove  %rax,%rdx
   94acd:	neg    %cl
   94acf:	shl    $0x3,%cl
   94ad2:	shlx   %rcx,(%rbx),%rcx
   94ad7:	or     %rcx,%rdx
   94ada:	xor    %r9,%rdx
   94add:	lea    (%rdx,%r8,1),%rsi
   94ae1:	or     %rcx,%rsi
   94ae4:	mov    $0xffffffff,%r12d
   94aea:	movabs $0x7fffffffffffffff,%r10
   94af4:	mov    $0x0,%r9d
   94afa:	movabs $0x8080808080808080,%rcx
   94b04:	test   %rcx,%rsi
   94b07:	jne    94c79 <sessions::fast::parse_events_avx2+0x34d9>
   94b0d:	lea    (%rdx,%rdx,4),%rax
   94b11:	shr    $0x8,%rdx
   94b15:	lea    (%rdx,%rax,2),%r8
   94b19:	mov    %r8,%rax
   94b1c:	movabs $0xff000000ff,%rdx
   94b26:	and    %rdx,%rax
   94b29:	movabs $0xf424000000064,%rcx
   94b33:	imul   %rcx,%rax
   94b37:	shr    $0x10,%r8
   94b3b:	and    %rdx,%r8
   94b3e:	movabs $0x271000000001,%rcx
   94b48:	imul   %rcx,%r8
   94b4c:	add    %rax,%r8
   94b4f:	shr    $0x20,%r8
   94b53:	mov    %rdi,%r10
   94b56:	jmp    94df4 <sessions::fast::parse_events_avx2+0x3654>
   94b5b:	xor    %eax,%eax
   94b5d:	movabs $0x7fffffffffffffff,%r10
   94b67:	xor    %r9d,%r9d
   94b6a:	mov    0x10(%rsp),%r11
   94b6f:	jmp    94c79 <sessions::fast::parse_events_avx2+0x34d9>
   94b74:	cmp    %edi,%esi
   94b76:	jne    94b85 <sessions::fast::parse_events_avx2+0x33e5>
   94b78:	xor    %eax,%eax
   94b7a:	mov    $0xffffffff,%r12d
   94b80:	jmp    94c6c <sessions::fast::parse_events_avx2+0x34cc>
   94b85:	xor    %edx,%edx
   94b87:	xor    %eax,%eax
   94b89:	xor    %esi,%esi
   94b8b:	xor    %r8d,%r8d
   94b8e:	xchg   %ax,%ax
   94b90:	movzbl (%rbx,%rdx,1),%edi
   94b94:	add    $0xd0,%dil
   94b98:	mov    $0xffffffff,%r12d
   94b9e:	cmp    $0x9,%dil
   94ba2:	ja     94c6a <sessions::fast::parse_events_avx2+0x34ca>
   94ba8:	test   %dil,%dil
   94bab:	mov    %r8,%r12
   94bae:	setne  %r8b
   94bb2:	or     %r8b,%sil
   94bb5:	movzbl %sil,%r8d
   94bb9:	and    $0x1,%r8d
   94bbd:	add    %r8d,%eax
   94bc0:	lea    (%r12,%r12,4),%r8
   94bc4:	movzbl %dil,%edi
   94bc8:	lea    (%rdi,%r8,2),%r8
   94bcc:	inc    %rdx
   94bcf:	cmp    %rdx,%rcx
   94bd2:	jne    94b90 <sessions::fast::parse_events_avx2+0x33f0>
   94bd4:	cmp    $0x14,%eax
   94bd7:	setb   %al
   94bda:	test   %r8,%r8
   94bdd:	setns  %cl
   94be0:	and    %al,%cl
   94be2:	cmp    $0x1,%cl
   94be5:	je     94df9 <sessions::fast::parse_events_avx2+0x3659>
   94beb:	xor    %eax,%eax
   94bed:	movabs $0x7fffffffffffffff,%r10
   94bf7:	xor    %r9d,%r9d
   94bfa:	mov    $0xffffffff,%r12d
   94c00:	jmp    94c79 <sessions::fast::parse_events_avx2+0x34d9>
   94c02:	mov    %ecx,%edx
   94c04:	add    $0xfffffffffffffff8,%rcx
   94c08:	lea    0x0(,%rcx,8),%esi
   94c0f:	xor    %eax,%eax
   94c11:	cmp    $0x10,%edx
   94c14:	shrx   %rsi,%r9,%rdx
   94c19:	cmovae %rax,%rdx
   94c1d:	mov    %ecx,%esi
   94c1f:	neg    %sil
   94c22:	shl    $0x3,%sil
   94c26:	shlx   %rsi,(%rbx),%rsi
   94c2b:	or     %rsi,%rdx
   94c2e:	xor    %r9,%rdx
   94c31:	lea    (%rdx,%r8,1),%rdi
   94c35:	or     %rsi,%rdi
   94c38:	mov    $0xffffffff,%r12d
   94c3e:	movabs $0x8080808080808080,%rsi
   94c48:	test   %rsi,%rdi
   94c4b:	jne    94c6c <sessions::fast::parse_events_avx2+0x34cc>
   94c4d:	mov    %rsi,%rdi
   94c50:	mov    (%rbx,%rcx,1),%rax
   94c54:	mov    %rax,%rcx
   94c57:	xor    %r9,%rcx
   94c5a:	lea    (%rcx,%r8,1),%rsi
   94c5e:	or     %rax,%rsi
   94c61:	test   %rdi,%rsi
   94c64:	je     94d7c <sessions::fast::parse_events_avx2+0x35dc>
   94c6a:	xor    %eax,%eax
   94c6c:	movabs $0x7fffffffffffffff,%r10
   94c76:	xor    %r9d,%r9d
   94c79:	incq   0x8(%rsp)
   94c7e:	mov    (%rsp),%r8
   94c82:	mov    %r8,%rcx
   94c85:	movabs $0x9e3779b97f4a7c15,%rdx
   94c8f:	imul   %rdx,%rcx
   94c93:	mov    0x80(%rsp),%rdx
   94c9b:	movzbl 0x920(%rdx),%edx
   94ca2:	xor    %esi,%esi
   94ca4:	sub    %dl,%sil
   94ca7:	shrx   %rsi,%rcx,%r15
   94cac:	mov    0xd0(%rsp),%rdi
   94cb4:	mov    0x68(%rdi),%rcx
   94cb8:	movzbl (%rcx,%r15,1),%esi
   94cbd:	mov    %r15,%rbx
   94cc0:	shl    $0x6,%rbx
   94cc4:	add    0x50(%rdi),%rbx
   94cc8:	lea    0x1(%rsi),%rdx
   94ccc:	shl    $0x5,%esi
   94ccf:	mov    %r8,(%rsi,%rbx,1)
   94cd3:	mov    %rax,0x8(%rsi,%rbx,1)
   94cd8:	mov    %r10,0x10(%rsi,%rbx,1)
   94cdd:	mov    %r12d,0x18(%rsi,%rbx,1)
   94ce2:	mov    %r9d,0x1c(%rsi,%rbx,1)
   94ce7:	cmp    $0x2,%rdx
   94ceb:	jne    94d5a <sessions::fast::parse_events_avx2+0x35ba>
   94ced:	movb   $0x0,(%rcx,%r15,1)
   94cf2:	mov    0x8(%rdi),%rax
   94cf6:	mov    0x20(%rdi),%rdx
   94cfa:	mov    (%rax,%r15,8),%rcx
   94cfe:	cmp    (%rdx,%r15,8),%rcx
   94d02:	mov    0x4c(%rsp),%esi
   94d06:	mov    0x70(%rsp),%r10d
   94d0b:	je     95831 <sessions::fast::parse_events_avx2+0x4091>
   94d11:	vmovaps (%rbx),%xmm0
   94d15:	movntdq %xmm0,(%rcx)
   94d19:	lea    0x10(%rcx),%rdx
   94d1d:	vmovaps 0x10(%rbx),%xmm0
   94d22:	movntdq %xmm0,(%rdx)
   94d26:	lea    0x20(%rcx),%rdx
   94d2a:	vmovaps 0x20(%rbx),%xmm0
   94d2f:	movntdq %xmm0,(%rdx)
   94d33:	add    $0x30,%rcx
   94d37:	vmovdqa 0x30(%rbx),%xmm0
   94d3c:	movntdq %xmm0,(%rcx)
   94d40:	addq   $0x40,(%rax,%r15,8)
   94d45:	mov    0x98(%rsp),%rbx
   94d4d:	mov    0x90(%rsp),%r15
   94d55:	jmp    941e0 <sessions::fast::parse_events_avx2+0x2a40>
   94d5a:	mov    %dl,(%rcx,%r15,1)
   94d5e:	mov    0x98(%rsp),%rbx
   94d66:	mov    0x90(%rsp),%r15
   94d6e:	mov    0x4c(%rsp),%esi
   94d72:	mov    0x70(%rsp),%r10d
   94d77:	jmp    941e0 <sessions::fast::parse_events_avx2+0x2a40>
   94d7c:	lea    (%rdx,%rdx,4),%rax
   94d80:	shr    $0x8,%rdx
   94d84:	lea    (%rdx,%rax,2),%rax
   94d88:	mov    %rax,%rdx
   94d8b:	movabs $0xff000000ff,%r8
   94d95:	and    %r8,%rdx
   94d98:	movabs $0xf424000000064,%rsi
   94da2:	imul   %rsi,%rdx
   94da6:	shr    $0x10,%rax
   94daa:	and    %r8,%rax
   94dad:	movabs $0x271000000001,%rdi
   94db7:	imul   %rdi,%rax
   94dbb:	add    %rdx,%rax
   94dbe:	shr    $0x20,%rax
   94dc2:	lea    (%rcx,%rcx,4),%rdx
   94dc6:	shr    $0x8,%rcx
   94dca:	lea    (%rcx,%rdx,2),%rcx
   94dce:	mov    %rcx,%rdx
   94dd1:	and    %r8,%rdx
   94dd4:	imul   %rsi,%rdx
   94dd8:	shr    $0x10,%rcx
   94ddc:	and    %r8,%rcx
   94ddf:	imul   %rdi,%rcx
   94de3:	add    %rdx,%rcx
   94de6:	shr    $0x20,%rcx
   94dea:	imul   $0x5f5e100,%rax,%r8
   94df1:	add    %rcx,%r8
   94df4:	mov    0x20(%rsp),%r9d
   94df9:	xor    %eax,%eax
   94dfb:	mov    $0xffffffff,%r12d
   94e01:	mov    0x138(%rsp),%ecx
   94e08:	cmp    0x110(%rsp),%ecx
   94e0f:	je     94fe1 <sessions::fast::parse_events_avx2+0x3841>
   94e15:	mov    0x6c(%rsp),%edi
   94e19:	cmp    %edi,0xc0(%rsp)
   94e20:	je     94fe1 <sessions::fast::parse_events_avx2+0x3841>
   94e26:	mov    0x28(%rsp),%edx
   94e2a:	mov    %edx,%ebx
   94e2c:	vpextrd $0x2,%xmm1,%eax
   94e32:	add    0x40(%rsp),%rbx
   94e37:	mov    %eax,%ecx
   94e39:	sub    %edx,%ecx
   94e3b:	cmp    $0x19,%rcx
   94e3f:	mov    %r8,0x30(%rsp)
   94e44:	je     94fec <sessions::fast::parse_events_avx2+0x384c>
   94e4a:	cmp    $0x14,%ecx
   94e4d:	mov    0x58(%rsp),%esi
   94e51:	jne    9521e <sessions::fast::parse_events_avx2+0x3a7e>
   94e57:	cmpb   $0x5a,0x13(%rbx)
   94e5b:	jne    952f4 <sessions::fast::parse_events_avx2+0x3b54>
   94e61:	mov    %rdi,0x28(%rsp)
   94e66:	mov    %r9d,0x20(%rsp)
   94e6b:	mov    %r10,%r15
   94e6e:	mov    (%rbx),%rdx
   94e71:	mov    0x80(%rsp),%rsi
   94e79:	mov    0x8e0(%rsi),%rax
   94e80:	imul   %rdx,%rax
   94e84:	shr    $0x3c,%rax
   94e88:	cmp    %rdx,0x698(%rsi,%rax,8)
   94e90:	jne    95b54 <sessions::fast::parse_events_avx2+0x43b4>
   94e96:	mov    0x718(%rsi,%rax,8),%rcx
   94e9e:	mov    0x798(%rsi,%rax,8),%rdx
   94ea6:	movzwl 0x8(%rbx),%esi
   94eaa:	xor    $0x3030,%rsi
   94eb1:	mov    0xb(%rbx),%rdi
   94eb5:	mov    %rdi,%rax
   94eb8:	movabs $0x3030303030303030,%r8
   94ec2:	xor    %r8,%rax
   94ec5:	lea    0x7676(%rsi),%r8d
   94ecc:	or     %esi,%r8d
   94ecf:	and    $0x8080,%r8d
   94ed6:	movabs $0x7676767676767676,%r9
   94ee0:	add    %rax,%r9
   94ee3:	or     %rdi,%r9
   94ee6:	movabs $0x8080008080008080,%r10
   94ef0:	and    %r10,%r9
   94ef3:	xor    %r10d,%r10d
   94ef6:	cmpb   $0x54,0xa(%rbx)
   94efa:	setne  %r10b
   94efe:	movabs $0xff0000ff0000,%r11
   94f08:	and    %r11,%rdi
   94f0b:	or     %r10,%rdi
   94f0e:	or     %r9,%rdi
   94f11:	or     %r8,%rdi
   94f14:	movabs $0x3a00003a0000,%r8
   94f1e:	cmp    %r8,%rdi
   94f21:	jne    952da <sessions::fast::parse_events_avx2+0x3b3a>
   94f27:	lea    (%rax,%rax,4),%rdi
   94f2b:	shr    $0x8,%rax
   94f2f:	lea    (%rax,%rdi,2),%r9
   94f33:	mov    %r9,%rax
   94f36:	shr    $0x30,%rax
   94f3a:	movzbl %al,%edi
   94f3d:	xor    %eax,%eax
   94f3f:	cmp    $0x3b,%rdi
   94f43:	mov    0x10(%rsp),%r11
   94f48:	ja     95374 <sessions::fast::parse_events_avx2+0x3bd4>
   94f4e:	mov    %r9d,%r8d
   94f51:	shr    $0x18,%r8d
   94f55:	cmp    $0x3b,%r8d
   94f59:	ja     95374 <sessions::fast::parse_events_avx2+0x3bd4>
   94f5f:	movzbl %r9b,%r9d
   94f63:	cmp    $0x17,%r9d
   94f67:	ja     95374 <sessions::fast::parse_events_avx2+0x3bd4>
   94f6d:	movzbl %sil,%r10d
   94f71:	lea    (%r10,%r10,4),%r10
   94f75:	shr    $0x8,%esi
   94f78:	lea    (%rsi,%r10,2),%rsi
   94f7c:	test   %rsi,%rsi
   94f7f:	je     95374 <sessions::fast::parse_events_avx2+0x3bd4>
   94f85:	cmp    %rdx,%rsi
   94f88:	jg     95374 <sessions::fast::parse_events_avx2+0x3bd4>
   94f8e:	add    %rcx,%rsi
   94f91:	imul   $0x15180,%rsi,%rax
   94f98:	imul   $0xe10,%r9,%rcx
   94f9f:	imul   $0x3c,%r8,%rdx
   94fa3:	add    %rdi,%rcx
   94fa6:	add    %rdx,%rcx
   94fa9:	add    %rax,%rcx
   94fac:	imul   $0x3e8,%rcx,%r8
   94fb3:	add    $0xfffffffffad9a400,%r8
   94fba:	mov    %r15,%r10
   94fbd:	mov    0x20(%rsp),%r9d
   94fc2:	mov    0x58(%rsp),%r14d
   94fc7:	mov    0x80(%rsp),%rsi
   94fcf:	cmp    %r8,0x8e8(%rsi)
   94fd6:	jg     95372 <sessions::fast::parse_events_avx2+0x3bd2>
   94fdc:	jmp    95485 <sessions::fast::parse_events_avx2+0x3ce5>
   94fe1:	xor    %r9d,%r9d
   94fe4:	mov    %r8,%r10
   94fe7:	jmp    94c79 <sessions::fast::parse_events_avx2+0x34d9>
   94fec:	movzbl 0x13(%rbx),%r14d
   94ff1:	cmp    $0x2b,%r14d
   94ff5:	mov    0x58(%rsp),%esi
   94ff9:	je     95005 <sessions::fast::parse_events_avx2+0x3865>
   94ffb:	cmp    $0x2d,%r14d
   94fff:	jne    952f4 <sessions::fast::parse_events_avx2+0x3b54>
   95005:	mov    %rdi,0x28(%rsp)
   9500a:	mov    %r9d,0x20(%rsp)
   9500f:	mov    %r10,0x60(%rsp)
   95014:	mov    (%rbx),%rdx
   95017:	mov    0x80(%rsp),%rsi
   9501f:	mov    0x8e0(%rsi),%rax
   95026:	imul   %rdx,%rax
   9502a:	shr    $0x3c,%rax
   9502e:	cmp    %rdx,0x698(%rsi,%rax,8)
   95036:	jne    95aaa <sessions::fast::parse_events_avx2+0x430a>
   9503c:	mov    0x718(%rsi,%rax,8),%rcx
   95044:	mov    0x798(%rsi,%rax,8),%rsi
   9504c:	movzwl 0x8(%rbx),%r9d
   95051:	xor    $0x3030,%r9
   95058:	mov    0xb(%rbx),%rdx
   9505c:	mov    %rdx,%rax
   9505f:	movabs $0x3030303030303030,%rdi
   95069:	xor    %rdi,%rax
   9506c:	lea    0x7676(%r9),%edi
   95073:	or     %r9d,%edi
   95076:	and    $0x8080,%edi
   9507c:	movabs $0x7676767676767676,%r8
   95086:	add    %rax,%r8
   95089:	or     %rdx,%r8
   9508c:	movabs $0x8080008080008080,%r10
   95096:	and    %r10,%r8
   95099:	xor    %r10d,%r10d
   9509c:	cmpb   $0x54,0xa(%rbx)
   950a0:	setne  %r10b
   950a4:	movabs $0xff0000ff0000,%r11
   950ae:	and    %r11,%rdx
   950b1:	or     %r10,%rdx
   950b4:	or     %r8,%rdx
   950b7:	or     %rdi,%rdx
   950ba:	movabs $0x3a00003a0000,%rdi
   950c4:	cmp    %rdi,%rdx
   950c7:	jne    952da <sessions::fast::parse_events_avx2+0x3b3a>
   950cd:	lea    (%rax,%rax,4),%rdx
   950d1:	shr    $0x8,%rax
   950d5:	lea    (%rax,%rdx,2),%r8
   950d9:	mov    %r8,%rax
   950dc:	shr    $0x30,%rax
   950e0:	movzbl %al,%edx
   950e3:	xor    %eax,%eax
   950e5:	cmp    $0x3b,%rdx
   950e9:	mov    0x10(%rsp),%r11
   950ee:	ja     95374 <sessions::fast::parse_events_avx2+0x3bd4>
   950f4:	mov    %r8d,%edi
   950f7:	shr    $0x18,%edi
   950fa:	cmp    $0x3b,%edi
   950fd:	ja     95374 <sessions::fast::parse_events_avx2+0x3bd4>
   95103:	movzbl %r8b,%r8d
   95107:	cmp    $0x17,%r8d
   9510b:	ja     95374 <sessions::fast::parse_events_avx2+0x3bd4>
   95111:	movzbl %r9b,%r10d
   95115:	lea    (%r10,%r10,4),%r10
   95119:	shr    $0x8,%r9d
   9511d:	lea    (%r9,%r10,2),%r9
   95121:	test   %r9,%r9
   95124:	je     95374 <sessions::fast::parse_events_avx2+0x3bd4>
   9512a:	cmp    %rsi,%r9
   9512d:	jg     95374 <sessions::fast::parse_events_avx2+0x3bd4>
   95133:	cmpb   $0x3a,0x16(%rbx)
   95137:	jne    95372 <sessions::fast::parse_events_avx2+0x3bd2>
   9513d:	movzbl 0x14(%rbx),%esi
   95141:	add    $0xd0,%sil
   95145:	xor    %eax,%eax
   95147:	cmp    $0x9,%sil
   9514b:	ja     95374 <sessions::fast::parse_events_avx2+0x3bd4>
   95151:	movzbl 0x15(%rbx),%r11d
   95156:	add    $0xd0,%r11b
   9515a:	cmp    $0x9,%r11b
   9515e:	ja     952dc <sessions::fast::parse_events_avx2+0x3b3c>
   95164:	movzbl 0x17(%rbx),%r15d
   95169:	add    $0xd0,%r15b
   9516d:	cmp    $0x9,%r15b
   95171:	ja     952dc <sessions::fast::parse_events_avx2+0x3b3c>
   95177:	movzbl 0x18(%rbx),%r10d
   9517c:	add    $0xd0,%r10b
   95180:	cmp    $0x9,%r10b
   95184:	ja     952dc <sessions::fast::parse_events_avx2+0x3b3c>
   9518a:	movzbl %sil,%eax
   9518e:	add    %eax,%eax
   95190:	lea    (%rax,%rax,4),%esi
   95193:	add    %r11b,%sil
   95196:	xor    %eax,%eax
   95198:	cmp    $0x17,%sil
   9519c:	ja     952dc <sessions::fast::parse_events_avx2+0x3b3c>
   951a2:	movzbl %r15b,%r11d
   951a6:	add    %r11d,%r11d
   951a9:	lea    (%r11,%r11,4),%r11d
   951ad:	add    %r10b,%r11b
   951b0:	cmp    $0x3b,%r11b
   951b4:	ja     952dc <sessions::fast::parse_events_avx2+0x3b3c>
   951ba:	add    %rcx,%r9
   951bd:	imul   $0x15180,%r9,%rax
   951c4:	imul   $0xe10,%r8,%rcx
   951cb:	imul   $0x3c,%rdi,%rdi
   951cf:	add    %rdx,%rcx
   951d2:	add    %rdi,%rcx
   951d5:	add    %rax,%rcx
   951d8:	imul   $0x3e8,%rcx,%rax
   951df:	add    $0xfffffffffad9a400,%rax
   951e5:	movzbl %r11b,%ecx
   951e9:	movzbl %sil,%edx
   951ed:	imul   $0x36ee80,%rdx,%rdx
   951f4:	imul   $0xea60,%rcx,%rcx
   951fb:	add    %rdx,%rcx
   951fe:	mov    %rcx,%r8
   95201:	neg    %r8
   95204:	cmp    $0x2b,%r14b
   95208:	cmovne %rcx,%r8
   9520c:	add    %rax,%r8
   9520f:	mov    0x10(%rsp),%r11
   95214:	mov    0x60(%rsp),%r10
   95219:	jmp    94fbd <sessions::fast::parse_events_avx2+0x381d>
   9521e:	lea    -0x1(%rcx),%edx
   95221:	cmp    $0x10,%edx
   95224:	jae    952ee <sessions::fast::parse_events_avx2+0x3b4e>
   9522a:	mov    %r9d,%r15d
   9522d:	cmp    $0x9,%ecx
   95230:	movabs $0x7676767676767676,%r8
   9523a:	movabs $0x3030303030303030,%r9
   95244:	jae    9538d <sessions::fast::parse_events_avx2+0x3bed>
   9524a:	lea    0x0(,%rcx,8),%edx
   95251:	xor    %eax,%eax
   95253:	cmp    $0x8,%rcx
   95257:	shrx   %rdx,%r9,%rdx
   9525c:	cmove  %rax,%rdx
   95260:	neg    %cl
   95262:	shl    $0x3,%cl
   95265:	shlx   %rcx,(%rbx),%rcx
   9526a:	or     %rcx,%rdx
   9526d:	xor    %r9,%rdx
   95270:	lea    (%rdx,%r8,1),%rsi
   95274:	or     %rcx,%rsi
   95277:	movabs $0x8080808080808080,%rcx
   95281:	test   %rcx,%rsi
   95284:	jne    95374 <sessions::fast::parse_events_avx2+0x3bd4>
   9528a:	mov    %rdi,0x28(%rsp)
   9528f:	lea    (%rdx,%rdx,4),%rax
   95293:	shr    $0x8,%rdx
   95297:	lea    (%rdx,%rax,2),%r8
   9529b:	mov    %r8,%rax
   9529e:	movabs $0xff000000ff,%rdx
   952a8:	and    %rdx,%rax
   952ab:	movabs $0xf424000000064,%rcx
   952b5:	imul   %rcx,%rax
   952b9:	shr    $0x10,%r8
   952bd:	and    %rdx,%r8
   952c0:	movabs $0x271000000001,%rcx
   952ca:	imul   %rcx,%r8
   952ce:	add    %rax,%r8
   952d1:	shr    $0x20,%r8
   952d5:	jmp    95468 <sessions::fast::parse_events_avx2+0x3cc8>
   952da:	xor    %eax,%eax
   952dc:	xor    %r9d,%r9d
   952df:	mov    0x10(%rsp),%r11
   952e4:	mov    0x30(%rsp),%r10
   952e9:	jmp    94c79 <sessions::fast::parse_events_avx2+0x34d9>
   952ee:	cmp    0x28(%rsp),%eax
   952f2:	je     95372 <sessions::fast::parse_events_avx2+0x3bd2>
   952f4:	mov    %esi,%r14d
   952f7:	mov    %rdi,0x28(%rsp)
   952fc:	xor    %edx,%edx
   952fe:	xor    %eax,%eax
   95300:	xor    %esi,%esi
   95302:	xor    %r8d,%r8d
   95305:	data16 cs nopw 0x0(%rax,%rax,1)
   95310:	movzbl (%rbx,%rdx,1),%edi
   95314:	add    $0xd0,%dil
   95318:	cmp    $0x9,%dil
   9531c:	ja     95381 <sessions::fast::parse_events_avx2+0x3be1>
   9531e:	test   %dil,%dil
   95321:	mov    %r8,%r15
   95324:	setne  %r8b
   95328:	or     %r8b,%sil
   9532b:	movzbl %sil,%r8d
   9532f:	and    $0x1,%r8d
   95333:	add    %r8d,%eax
   95336:	lea    (%r15,%r15,4),%r8
   9533a:	movzbl %dil,%edi
   9533e:	lea    (%rdi,%r8,2),%r8
   95342:	inc    %rdx
   95345:	cmp    %rdx,%rcx
   95348:	jne    95310 <sessions::fast::parse_events_avx2+0x3b70>
   9534a:	cmp    $0x14,%eax
   9534d:	setb   %al
   95350:	test   %r8,%r8
   95353:	setns  %cl
   95356:	and    %al,%cl
   95358:	cmp    $0x1,%cl
   9535b:	jne    95372 <sessions::fast::parse_events_avx2+0x3bd2>
   9535d:	mov    0x80(%rsp),%rsi
   95365:	cmp    %r8,0x8e8(%rsi)
   9536c:	jle    95485 <sessions::fast::parse_events_avx2+0x3ce5>
   95372:	xor    %eax,%eax
   95374:	xor    %r9d,%r9d
   95377:	mov    0x30(%rsp),%r10
   9537c:	jmp    94c79 <sessions::fast::parse_events_avx2+0x34d9>
   95381:	xor    %eax,%eax
   95383:	mov    0x30(%rsp),%r10
   95388:	jmp    94c76 <sessions::fast::parse_events_avx2+0x34d6>
   9538d:	mov    %rdi,0x28(%rsp)
   95392:	mov    %ecx,%edx
   95394:	add    $0xfffffffffffffff8,%rcx
   95398:	lea    0x0(,%rcx,8),%esi
   9539f:	xor    %eax,%eax
   953a1:	cmp    $0x10,%edx
   953a4:	shrx   %rsi,%r9,%rdx
   953a9:	cmovae %rax,%rdx
   953ad:	mov    %ecx,%esi
   953af:	neg    %sil
   953b2:	shl    $0x3,%sil
   953b6:	shlx   %rsi,(%rbx),%rsi
   953bb:	or     %rsi,%rdx
   953be:	xor    %r9,%rdx
   953c1:	lea    (%rdx,%r8,1),%rdi
   953c5:	or     %rsi,%rdi
   953c8:	movabs $0x8080808080808080,%rsi
   953d2:	test   %rsi,%rdi
   953d5:	jne    95374 <sessions::fast::parse_events_avx2+0x3bd4>
   953d7:	mov    %rsi,%rdi
   953da:	mov    (%rbx,%rcx,1),%rax
   953de:	mov    %rax,%rcx
   953e1:	xor    %r9,%rcx
   953e4:	lea    (%rcx,%r8,1),%rsi
   953e8:	or     %rax,%rsi
   953eb:	test   %rdi,%rsi
   953ee:	jne    95372 <sessions::fast::parse_events_avx2+0x3bd2>
   953f0:	lea    (%rdx,%rdx,4),%rax
   953f4:	shr    $0x8,%rdx
   953f8:	lea    (%rdx,%rax,2),%rax
   953fc:	mov    %rax,%rdx
   953ff:	movabs $0xff000000ff,%r8
   95409:	and    %r8,%rdx
   9540c:	movabs $0xf424000000064,%rsi
   95416:	imul   %rsi,%rdx
   9541a:	shr    $0x10,%rax
   9541e:	and    %r8,%rax
   95421:	movabs $0x271000000001,%rdi
   9542b:	imul   %rdi,%rax
   9542f:	add    %rdx,%rax
   95432:	shr    $0x20,%rax
   95436:	lea    (%rcx,%rcx,4),%rdx
   9543a:	shr    $0x8,%rcx
   9543e:	lea    (%rcx,%rdx,2),%rcx
   95442:	mov    %rcx,%rdx
   95445:	and    %r8,%rdx
   95448:	imul   %rsi,%rdx
   9544c:	shr    $0x10,%rcx
   95450:	and    %r8,%rcx
   95453:	imul   %rdi,%rcx
   95457:	add    %rdx,%rcx
   9545a:	shr    $0x20,%rcx
   9545e:	imul   $0x5f5e100,%rax,%r8
   95465:	add    %rcx,%r8
   95468:	mov    %r15d,%r9d
   9546b:	mov    0x58(%rsp),%r14d
   95470:	mov    0x80(%rsp),%rsi
   95478:	cmp    %r8,0x8e8(%rsi)
   9547f:	jg     95372 <sessions::fast::parse_events_avx2+0x3bd2>
   95485:	xor    %eax,%eax
   95487:	mov    0x30(%rsp),%rdx
   9548c:	cmp    %r8,%rdx
   9548f:	setns  %al
   95492:	movabs $0x7fffffffffffffff,%rcx
   9549c:	add    %rcx,%rax
   9549f:	mov    %rdx,%rcx
   954a2:	sub    %r8,%rcx
   954a5:	cmovo  %rax,%rcx
   954a9:	xor    %eax,%eax
   954ab:	cmp    0x8f0(%rsi),%r8
   954b2:	jge    95826 <sessions::fast::parse_events_avx2+0x4086>
   954b8:	cmp    $0x5265c00,%rcx
   954bf:	jg     95826 <sessions::fast::parse_events_avx2+0x4086>
   954c5:	mov    0xd8(%rsp),%rcx
   954cd:	sub    %r14d,%ecx
   954d0:	mov    %r14d,%eax
   954d3:	cmp    $0x8,%ecx
   954d6:	je     95587 <sessions::fast::parse_events_avx2+0x3de7>
   954dc:	cmp    $0x4,%ecx
   954df:	movzbl 0x100(%rsp),%ebx
   954e7:	jne    95824 <sessions::fast::parse_events_avx2+0x4084>
   954ed:	mov    0x40(%rsp),%rcx
   954f2:	movzbl (%rcx,%rax,1),%ecx
   954f6:	cmp    $0x63,%ecx
   954f9:	je     957fa <sessions::fast::parse_events_avx2+0x405a>
   954ff:	cmp    $0x76,%ecx
   95502:	jne    95824 <sessions::fast::parse_events_avx2+0x4084>
   95508:	mov    0x40(%rsp),%rcx
   9550d:	cmpb   $0x69,0x1(%rcx,%rax,1)
   95512:	jne    95824 <sessions::fast::parse_events_avx2+0x4084>
   95518:	cmpb   $0x65,0x2(%rcx,%rax,1)
   9551d:	jne    95824 <sessions::fast::parse_events_avx2+0x4084>
   95523:	xor    %esi,%esi
   95525:	cmpb   $0x77,0x3(%rcx,%rax,1)
   9552a:	jne    9581a <sessions::fast::parse_events_avx2+0x407a>
   95530:	movzbl 0x50(%rsp),%eax
   95535:	mov    %rsi,%r15
   95538:	and    %al,%bl
   9553a:	je     95dca <sessions::fast::parse_events_avx2+0x462a>
   95540:	mov    %rdx,%rbx
   95543:	vextracti128 $0x1,%ymm0,%xmm0
   95549:	vpextrd $0x1,%xmm0,%ecx
   9554f:	vmovd  %xmm0,%edx
   95553:	vpextrd $0x2,%xmm0,%eax
   95559:	shl    $0x24,%rdx
   9555d:	shl    $0xc,%rcx
   95561:	or     %rdx,%rcx
   95564:	shr    $0xc,%eax
   95567:	or     %rcx,%rax
   9556a:	mov    0x80(%rsp),%rcx
   95572:	sub    0x8f8(%rcx),%r8d
   95579:	mov    %r8d,%r12d
   9557c:	mov    %rbx,%r10
   9557f:	mov    %r15,%r9
   95582:	jmp    94c79 <sessions::fast::parse_events_avx2+0x34d9>
   95587:	mov    0x40(%rsp),%rcx
   9558c:	cmpb   $0x70,(%rcx,%rax,1)
   95590:	jne    95824 <sessions::fast::parse_events_avx2+0x4084>
   95596:	cmpb   $0x75,0x1(%rcx,%rax,1)
   9559b:	jne    95824 <sessions::fast::parse_events_avx2+0x4084>
   955a1:	cmpb   $0x72,0x2(%rcx,%rax,1)
   955a6:	jne    95824 <sessions::fast::parse_events_avx2+0x4084>
   955ac:	cmpb   $0x63,0x3(%rcx,%rax,1)
   955b1:	jne    95824 <sessions::fast::parse_events_avx2+0x4084>
   955b7:	cmpb   $0x68,0x4(%rcx,%rax,1)
   955bc:	jne    95824 <sessions::fast::parse_events_avx2+0x4084>
   955c2:	cmpb   $0x61,0x5(%rcx,%rax,1)
   955c7:	jne    95824 <sessions::fast::parse_events_avx2+0x4084>
   955cd:	cmpb   $0x73,0x6(%rcx,%rax,1)
   955d2:	jne    95824 <sessions::fast::parse_events_avx2+0x4084>
   955d8:	mov    %rdx,%r15
   955db:	cmpb   $0x65,0x7(%rcx,%rax,1)
   955e0:	jne    95c6c <sessions::fast::parse_events_avx2+0x44cc>
   955e6:	mov    %r8,0x60(%rsp)
   955eb:	vmovdqu %ymm0,0x140(%rsp)
   955f4:	mov    %r10,%rbx
   955f7:	mov    %r9d,%edi
   955fa:	add    %rcx,%rdi
   955fd:	mov    0x78(%rsp),%rsi
   95602:	sub    %r9d,%esi
   95605:	vzeroupper
   95608:	call   9d580 <sessions::events::parse_price>
   9560d:	test   $0x1,%al
   9560f:	je     95c79 <sessions::fast::parse_events_avx2+0x44d9>
   95615:	test   %edx,%edx
   95617:	je     95ce9 <sessions::fast::parse_events_avx2+0x4549>
   9561d:	mov    %edx,%r14d
   95620:	mov    0xc0(%rsp),%rsi
   95628:	sub    0x6c(%rsp),%esi
   9562c:	cmp    $0xa,%esi
   9562f:	mov    0x28(%rsp),%rdi
   95634:	ja     95e53 <sessions::fast::parse_events_avx2+0x46b3>
   9563a:	mov    0x40(%rsp),%rax
   9563f:	vmovdqu (%rax,%rdi,1),%xmm1
   95644:	vmovd  %esi,%xmm0
   95648:	vpbroadcastb %xmm0,%xmm0
   9564d:	vpcmpgtb -0x8c6e5(%rip),%xmm0,%xmm0        # 8f70 <__abi_tag+0x8c74>
   95655:	vpaddb -0x8ca3d(%rip),%xmm1,%xmm2        # 8c20 <__abi_tag+0x8924>
   9565d:	vpminub -0x8cea5(%rip),%xmm2,%xmm3        # 87c0 <__abi_tag+0x84c4>
   95665:	vpcmpeqb %xmm3,%xmm2,%xmm2
   95669:	vpaddb -0x8cb91(%rip),%xmm1,%xmm3        # 8ae0 <__abi_tag+0x87e4>
   95671:	vmovdqa -0x8d379(%rip),%xmm5        # 8300 <__abi_tag+0x8004>
   95679:	vpminub %xmm5,%xmm3,%xmm4
   9567d:	vpcmpeqb %xmm4,%xmm3,%xmm3
   95681:	vpaddb -0x8d649(%rip),%xmm1,%xmm4        # 8040 <__abi_tag+0x7d44>
   95689:	vpminub %xmm5,%xmm4,%xmm5
   9568d:	vpcmpeqb %xmm5,%xmm4,%xmm5
   95691:	vpcmpeqb -0x8ce19(%rip),%xmm1,%xmm4        # 8880 <__abi_tag+0x8584>
   95699:	vpor   %xmm2,%xmm3,%xmm6
   9569d:	vpor   %xmm5,%xmm4,%xmm7
   956a1:	vpor   %xmm6,%xmm7,%xmm6
   956a5:	vpandn %xmm0,%xmm6,%xmm6
   956a9:	vpmovmskb %xmm6,%eax
   956ad:	test   %eax,%eax
   956af:	jne    95e53 <sessions::fast::parse_events_avx2+0x46b3>
   956b5:	vpaddb -0x8d76d(%rip),%xmm1,%xmm6        # 7f50 <__abi_tag+0x7c54>
   956bd:	vpand  %xmm6,%xmm5,%xmm5
   956c1:	vpaddb -0x8c809(%rip),%xmm1,%xmm6        # 8ec0 <__abi_tag+0x8bc4>
   956c9:	vpand  %xmm6,%xmm3,%xmm3
   956cd:	vpaddb -0x8d245(%rip),%xmm1,%xmm1        # 8490 <__abi_tag+0x8194>
   956d5:	vpand  %xmm1,%xmm2,%xmm1
   956d9:	vpor   %xmm3,%xmm1,%xmm1
   956dd:	vpand  -0x8ce55(%rip),%xmm4,%xmm2        # 8890 <__abi_tag+0x8594>
   956e5:	vpor   %xmm2,%xmm5,%xmm2
   956e9:	vpor   %xmm1,%xmm2,%xmm1
   956ed:	vpand  %xmm1,%xmm0,%xmm0
   956f1:	vpmaddubsw -0x8d79a(%rip),%xmm0,%xmm0        # 7f60 <__abi_tag+0x7c64>
   956fa:	vpmaddwd -0x8ce62(%rip),%xmm0,%xmm0        # 88a0 <__abi_tag+0x85a4>
   95702:	vpextrd $0x1,%xmm0,%eax
   95708:	vmovd  %xmm0,%ecx
   9570c:	vpextrd $0x2,%xmm0,%edx
   95712:	shl    $0x24,%rcx
   95716:	shl    $0xc,%rax
   9571a:	or     %rcx,%rax
   9571d:	shr    $0xc,%edx
   95720:	or     %rax,%rdx
   95723:	mov    %rdx,%rcx
   95726:	movabs $0x9e3779b97f4a7c15,%rax
   95730:	imul   %rax,%rcx
   95734:	shr    $0x20,%rcx
   95738:	mov    0x80(%rsp),%r8
   95740:	mov    0x10(%r8),%rsi
   95744:	mov    0x30(%r8),%rax
   95748:	mov    %eax,%edi
   9574a:	and    %ecx,%edi
   9574c:	cmp    %rsi,%rdi
   9574f:	jae    95f86 <sessions::fast::parse_events_avx2+0x47e6>
   95755:	mov    0x8(%r8),%rcx
   95759:	mov    (%rcx,%rdi,8),%r8
   9575d:	cmp    %rdx,%r8
   95760:	je     95cf1 <sessions::fast::parse_events_avx2+0x4551>
   95766:	cmp    $0xffffffffffffffff,%r8
   9576a:	je     95d16 <sessions::fast::parse_events_avx2+0x4576>
   95770:	inc    %rdi
   95773:	and    %rax,%rdi
   95776:	cmp    %rsi,%rdi
   95779:	jb     95759 <sessions::fast::parse_events_avx2+0x3fb9>
   9577b:	jmp    95f86 <sessions::fast::parse_events_avx2+0x47e6>
   95780:	add    %rcx,%rdi
   95783:	mov    %r10,%rbx
   95786:	mov    %r9d,0x20(%rsp)
   9578b:	vmovdqu %ymm0,0x140(%rsp)
   95794:	vzeroupper
   95797:	call   a1950 <sessions::fast::keys::intern_exotic>
   9579c:	vmovdqu 0x140(%rsp),%ymm0
   957a5:	mov    0x20(%rsp),%r9d
   957aa:	mov    %rbx,%r10
   957ad:	vpbroadcastb -0x8bf2a(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   957b6:	vpbroadcastb -0x8bf34(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   957bf:	vpbroadcastb -0x8bf3e(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   957c8:	vpbroadcastb -0x8bf48(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   957d1:	vpbroadcastb -0x8bf52(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   957da:	vpbroadcastb -0x8bf5c(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   957e3:	vpbroadcastb -0x8bf66(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   957ec:	mov    0x10(%rsp),%r11
   957f1:	vpxor  %xmm7,%xmm7,%xmm7
   957f5:	jmp    94654 <sessions::fast::parse_events_avx2+0x2eb4>
   957fa:	mov    0x40(%rsp),%rcx
   957ff:	cmpb   $0x61,0x1(%rcx,%rax,1)
   95804:	jne    95824 <sessions::fast::parse_events_avx2+0x4084>
   95806:	cmpb   $0x72,0x2(%rcx,%rax,1)
   9580b:	jne    95824 <sessions::fast::parse_events_avx2+0x4084>
   9580d:	xor    %esi,%esi
   9580f:	cmpb   $0x74,0x3(%rcx,%rax,1)
   95814:	je     95530 <sessions::fast::parse_events_avx2+0x3d90>
   9581a:	xor    %eax,%eax
   9581c:	mov    %rdx,%r10
   9581f:	jmp    94c76 <sessions::fast::parse_events_avx2+0x34d6>
   95824:	xor    %eax,%eax
   95826:	xor    %r9d,%r9d
   95829:	mov    %rdx,%r10
   9582c:	jmp    94c79 <sessions::fast::parse_events_avx2+0x34d9>
   95831:	mov    0xd0(%rsp),%rdi
   95839:	mov    0x108(%rsp),%rsi
   95841:	mov    %r15,%rdx
   95844:	vzeroupper
   95847:	call   78a10 <<sessions::fast::sink::Sink<sessions::fast::EventRec>>::refill>
   9584c:	mov    0x70(%rsp),%r10d
   95851:	mov    0x4c(%rsp),%esi
   95855:	mov    0xd0(%rsp),%rdi
   9585d:	vpbroadcastb -0x8bfd7(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   95866:	vpbroadcastb -0x8bfe1(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   9586f:	vpbroadcastb -0x8bfeb(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   95878:	vpbroadcastb -0x8bff5(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   95881:	vpbroadcastb -0x8bfff(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   9588a:	vpbroadcastb -0x8c009(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   95893:	vpbroadcastb -0x8c013(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   9589c:	vpbroadcastb -0x8c01d(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   958a5:	vpbroadcastb -0x8c027(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   958ae:	vpbroadcastb -0x8c031(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   958b7:	mov    0x10(%rsp),%r11
   958bc:	vpxor  %xmm7,%xmm7,%xmm7
   958c0:	mov    0x8(%rdi),%rax
   958c4:	mov    (%rax,%r15,8),%rcx
   958c8:	jmp    94d11 <sessions::fast::parse_events_avx2+0x3571>
   958cd:	vmovdqu %ymm0,0x140(%rsp)
   958d6:	add    $0x98,%rsi
   958dd:	lea    0xa0(%rsp),%rdi
   958e5:	vzeroupper
   958e8:	call   729f0 <<sessions::fast::ts::Calendar>::month_slow>
   958ed:	cmpb   $0x0,0xa0(%rsp)
   958f5:	je     95a2d <sessions::fast::parse_events_avx2+0x428d>
   958fb:	mov    0xa8(%rsp),%rcx
   95903:	mov    0xb0(%rsp),%rdi
   9590b:	vpxor  %xmm7,%xmm7,%xmm7
   9590f:	vpbroadcastb -0x8c092(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   95918:	vpbroadcastb -0x8c09a(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   95921:	vpbroadcastb -0x8c0a2(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   9592a:	vpbroadcastb -0x8c0aa(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   95933:	vpbroadcastb -0x8c0b2(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   9593c:	vpbroadcastb -0x8c0ba(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   95945:	vpbroadcastb -0x8c0c2(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   9594e:	vpbroadcastb -0x8c0ca(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   95957:	vpbroadcastb -0x8c0d2(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   95960:	vpbroadcastb -0x8c0da(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   95969:	vmovdqu 0x140(%rsp),%ymm0
   95972:	vmovdqa 0x30(%rsp),%xmm1
   95978:	jmp    94899 <sessions::fast::parse_events_avx2+0x30f9>
   9597d:	vmovdqu %ymm0,0x140(%rsp)
   95986:	add    $0x98,%rsi
   9598d:	lea    0xa0(%rsp),%rdi
   95995:	vzeroupper
   95998:	call   729f0 <<sessions::fast::ts::Calendar>::month_slow>
   9599d:	cmpb   $0x0,0xa0(%rsp)
   959a5:	je     95a2d <sessions::fast::parse_events_avx2+0x428d>
   959ab:	mov    0xa8(%rsp),%rcx
   959b3:	mov    0xb0(%rsp),%rdx
   959bb:	vpxor  %xmm7,%xmm7,%xmm7
   959bf:	vpbroadcastb -0x8c142(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   959c8:	vpbroadcastb -0x8c14a(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   959d1:	vpbroadcastb -0x8c152(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   959da:	vpbroadcastb -0x8c15a(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   959e3:	vpbroadcastb -0x8c162(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   959ec:	vpbroadcastb -0x8c16a(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   959f5:	vpbroadcastb -0x8c172(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   959fe:	vpbroadcastb -0x8c17a(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   95a07:	vpbroadcastb -0x8c182(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   95a10:	vpbroadcastb -0x8c18a(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   95a19:	vmovdqu 0x140(%rsp),%ymm0
   95a22:	vmovdqa 0x30(%rsp),%xmm1
   95a28:	jmp    946fa <sessions::fast::parse_events_avx2+0x2f5a>
   95a2d:	xor    %eax,%eax
   95a2f:	mov    $0xffffffff,%r12d
   95a35:	movabs $0x7fffffffffffffff,%r10
   95a3f:	xor    %r9d,%r9d
   95a42:	vpxor  %xmm7,%xmm7,%xmm7
   95a46:	mov    0x10(%rsp),%r11
   95a4b:	vpbroadcastb -0x8c1ce(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   95a54:	vpbroadcastb -0x8c1d6(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   95a5d:	vpbroadcastb -0x8c1de(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   95a66:	vpbroadcastb -0x8c1e6(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   95a6f:	vpbroadcastb -0x8c1ee(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   95a78:	vpbroadcastb -0x8c1f6(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   95a81:	vpbroadcastb -0x8c1fe(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   95a8a:	vpbroadcastb -0x8c206(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   95a93:	vpbroadcastb -0x8c20e(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   95a9c:	vpbroadcastb -0x8c216(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   95aa5:	jmp    94c79 <sessions::fast::parse_events_avx2+0x34d9>
   95aaa:	vmovdqu %ymm0,0x140(%rsp)
   95ab3:	add    $0x98,%rsi
   95aba:	lea    0xa0(%rsp),%rdi
   95ac2:	vzeroupper
   95ac5:	call   729f0 <<sessions::fast::ts::Calendar>::month_slow>
   95aca:	cmpb   $0x0,0xa0(%rsp)
   95ad2:	je     95bfa <sessions::fast::parse_events_avx2+0x445a>
   95ad8:	mov    0xa8(%rsp),%rcx
   95ae0:	mov    0xb0(%rsp),%rsi
   95ae8:	vpxor  %xmm7,%xmm7,%xmm7
   95aec:	vpbroadcastb -0x8c26f(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   95af5:	vpbroadcastb -0x8c277(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   95afe:	vpbroadcastb -0x8c27f(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   95b07:	vpbroadcastb -0x8c287(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   95b10:	vpbroadcastb -0x8c28f(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   95b19:	vpbroadcastb -0x8c297(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   95b22:	vpbroadcastb -0x8c29f(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   95b2b:	vpbroadcastb -0x8c2a7(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   95b34:	vpbroadcastb -0x8c2af(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   95b3d:	vpbroadcastb -0x8c2b7(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   95b46:	vmovdqu 0x140(%rsp),%ymm0
   95b4f:	jmp    9504c <sessions::fast::parse_events_avx2+0x38ac>
   95b54:	vmovdqu %ymm0,0x140(%rsp)
   95b5d:	add    $0x98,%rsi
   95b64:	lea    0xa0(%rsp),%rdi
   95b6c:	vzeroupper
   95b6f:	call   729f0 <<sessions::fast::ts::Calendar>::month_slow>
   95b74:	cmpb   $0x0,0xa0(%rsp)
   95b7c:	je     95bfa <sessions::fast::parse_events_avx2+0x445a>
   95b7e:	mov    0xa8(%rsp),%rcx
   95b86:	mov    0xb0(%rsp),%rdx
   95b8e:	vpxor  %xmm7,%xmm7,%xmm7
   95b92:	vpbroadcastb -0x8c315(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   95b9b:	vpbroadcastb -0x8c31d(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   95ba4:	vpbroadcastb -0x8c325(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   95bad:	vpbroadcastb -0x8c32d(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   95bb6:	vpbroadcastb -0x8c335(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   95bbf:	vpbroadcastb -0x8c33d(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   95bc8:	vpbroadcastb -0x8c345(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   95bd1:	vpbroadcastb -0x8c34d(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   95bda:	vpbroadcastb -0x8c355(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   95be3:	vpbroadcastb -0x8c35d(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   95bec:	vmovdqu 0x140(%rsp),%ymm0
   95bf5:	jmp    94ea6 <sessions::fast::parse_events_avx2+0x3706>
   95bfa:	xor    %eax,%eax
   95bfc:	xor    %r9d,%r9d
   95bff:	vpxor  %xmm7,%xmm7,%xmm7
   95c03:	mov    0x10(%rsp),%r11
   95c08:	vpbroadcastb -0x8c38b(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   95c11:	vpbroadcastb -0x8c393(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   95c1a:	vpbroadcastb -0x8c39b(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   95c23:	vpbroadcastb -0x8c3a3(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   95c2c:	vpbroadcastb -0x8c3ab(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   95c35:	vpbroadcastb -0x8c3b3(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   95c3e:	vpbroadcastb -0x8c3bb(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   95c47:	vpbroadcastb -0x8c3c3(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   95c50:	vpbroadcastb -0x8c3cb(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   95c59:	vpbroadcastb -0x8c3d3(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   95c62:	mov    0x30(%rsp),%r10
   95c67:	jmp    94c79 <sessions::fast::parse_events_avx2+0x34d9>
   95c6c:	xor    %eax,%eax
   95c6e:	xor    %r9d,%r9d
   95c71:	mov    %r15,%r10
   95c74:	jmp    94c79 <sessions::fast::parse_events_avx2+0x34d9>
   95c79:	xor    %eax,%eax
   95c7b:	xor    %r9d,%r9d
   95c7e:	vpxor  %xmm7,%xmm7,%xmm7
   95c82:	mov    0x10(%rsp),%r11
   95c87:	vpbroadcastb -0x8c40a(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   95c90:	vpbroadcastb -0x8c412(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   95c99:	vpbroadcastb -0x8c41a(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   95ca2:	vpbroadcastb -0x8c422(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   95cab:	vpbroadcastb -0x8c42a(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   95cb4:	vpbroadcastb -0x8c432(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   95cbd:	vpbroadcastb -0x8c43a(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   95cc6:	vpbroadcastb -0x8c442(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   95ccf:	vpbroadcastb -0x8c44a(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   95cd8:	vpbroadcastb -0x8c452(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   95ce1:	mov    %r15,%r10
   95ce4:	jmp    94c79 <sessions::fast::parse_events_avx2+0x34d9>
   95ce9:	xor    %esi,%esi
   95ceb:	vpxor  %xmm7,%xmm7,%xmm7
   95cef:	jmp    95d3f <sessions::fast::parse_events_avx2+0x459f>
   95cf1:	mov    0x80(%rsp),%rax
   95cf9:	mov    0x28(%rax),%rsi
   95cfd:	cmp    %rsi,%rdi
   95d00:	jae    95f92 <sessions::fast::parse_events_avx2+0x47f2>
   95d06:	mov    0x80(%rsp),%rax
   95d0e:	mov    0x20(%rax),%rax
   95d12:	mov    (%rax,%rdi,4),%r9d
   95d16:	cmp    %rdx,%r8
   95d19:	je     95d2a <sessions::fast::parse_events_avx2+0x458a>
   95d1b:	mov    0x80(%rsp),%rax
   95d23:	mov    0x918(%rax),%r9d
   95d2a:	mov    %r9,%rsi
   95d2d:	shl    $0x18,%esi
   95d30:	or     %r14d,%esi
   95d33:	vpxor  %xmm7,%xmm7,%xmm7
   95d37:	mov    0xb8(%rsp),%r13
   95d3f:	mov    0x10(%rsp),%r11
   95d44:	vpbroadcastb -0x8c4c7(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   95d4d:	vpbroadcastb -0x8c4cf(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   95d56:	vpbroadcastb -0x8c4d7(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   95d5f:	vpbroadcastb -0x8c4df(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   95d68:	vpbroadcastb -0x8c4e7(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   95d71:	vpbroadcastb -0x8c4ef(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   95d7a:	vpbroadcastb -0x8c4f7(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   95d83:	vpbroadcastb -0x8c4ff(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   95d8c:	vpbroadcastb -0x8c507(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   95d95:	vpbroadcastb -0x8c50f(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   95d9e:	mov    %rbx,%r10
   95da1:	vmovdqu 0x140(%rsp),%ymm0
   95daa:	movzbl 0x100(%rsp),%ebx
   95db2:	movzbl 0x50(%rsp),%eax
   95db7:	mov    %r15,%rdx
   95dba:	mov    0x60(%rsp),%r8
   95dbf:	mov    %rsi,%r15
   95dc2:	and    %al,%bl
   95dc4:	jne    95540 <sessions::fast::parse_events_avx2+0x3da0>
   95dca:	mov    %rdx,%rbx
   95dcd:	mov    0x110(%rsp),%rdi
   95dd5:	add    0x40(%rsp),%rdi
   95dda:	mov    %r10,%rsi
   95ddd:	mov    %r8,%r12
   95de0:	vzeroupper
   95de3:	call   a1950 <sessions::fast::keys::intern_exotic>
   95de8:	mov    %r12,%r8
   95deb:	vpbroadcastb -0x8c565(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   95df4:	vpbroadcastb -0x8c56f(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   95dfd:	vpbroadcastb -0x8c579(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   95e06:	vpbroadcastb -0x8c583(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   95e0f:	vpbroadcastb -0x8c58d(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   95e18:	vpbroadcastb -0x8c597(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   95e21:	vpbroadcastb -0x8c5a1(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   95e2a:	vpbroadcastb -0x8c5ab(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   95e33:	vpbroadcastb -0x8c5b5(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   95e3c:	vpbroadcastb -0x8c5bf(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   95e45:	mov    0x10(%rsp),%r11
   95e4a:	vpxor  %xmm7,%xmm7,%xmm7
   95e4e:	jmp    9556a <sessions::fast::parse_events_avx2+0x3dca>
   95e53:	add    0x40(%rsp),%rdi
   95e58:	call   a2020 <sessions::fast::keys::lookup_exotic>
   95e5d:	cmp    $0x1,%rax
   95e61:	je     95723 <sessions::fast::parse_events_avx2+0x3f83>
   95e67:	jmp    95d1b <sessions::fast::parse_events_avx2+0x457b>
   95e6c:	nopl   0x0(%rax)
   95e70:	mov    %r10d,0x0(%r13,%rbp,4)
   95e75:	mov    %r11d,(%r14,%rbp,4)
   95e79:	mov    0x10(%rsp),%r11
   95e7e:	mov    %edx,(%r11,%rbp,4)
   95e82:	inc    %rbp
   95e85:	test   %rbp,%rbp
   95e88:	jne    9418a <sessions::fast::parse_events_avx2+0x29ea>
   95e8e:	xor    %ebx,%ebx
   95e90:	mov    0xe8(%rsp),%rbp
   95e98:	mov    0x30(%rsp),%rcx
   95e9d:	nopl   (%rax)
   95ea0:	cmpb   $0xa,(%rdi,%rbx,1)
   95ea4:	je     95eb6 <sessions::fast::parse_events_avx2+0x4716>
   95ea6:	inc    %rbx
   95ea9:	cmp    %rbx,%rcx
   95eac:	jne    95ea0 <sessions::fast::parse_events_avx2+0x4700>
   95eae:	mov    %rax,%r15
   95eb1:	mov    %rcx,%rbx
   95eb4:	jmp    95eb9 <sessions::fast::parse_events_avx2+0x4719>
   95eb6:	mov    %rax,%r15
   95eb9:	mov    %rbx,%rsi
   95ebc:	lea    0x118(%rsp),%rdx
   95ec4:	vzeroupper
   95ec7:	call   3b650 <sessions::fast::scan::long_line::<7, sessions::fast::EventLines<sessions::fast::scan::Avx2>>>
   95ecc:	lea    (%r15,%rbx,1),%rax
   95ed0:	inc    %rax
   95ed3:	vpxor  %xmm7,%xmm7,%xmm7
   95ed7:	vpbroadcastb -0x8c65a(%rip),%ymm9        # 9886 <__abi_tag+0x958a>
   95ee0:	vpbroadcastb -0x8c662(%rip),%ymm10        # 9887 <__abi_tag+0x958b>
   95ee9:	vpbroadcastb -0x8c66a(%rip),%ymm11        # 9888 <__abi_tag+0x958c>
   95ef2:	vpbroadcastb -0x8c672(%rip),%ymm12        # 9889 <__abi_tag+0x958d>
   95efb:	vpbroadcastb -0x8c67a(%rip),%ymm13        # 988a <__abi_tag+0x958e>
   95f04:	vpbroadcastb -0x8c682(%rip),%ymm14        # 988b <__abi_tag+0x958f>
   95f0d:	vpbroadcastb -0x8c68a(%rip),%ymm15        # 988c <__abi_tag+0x9590>
   95f16:	vpbroadcastb -0x8c692(%rip),%ymm4        # 988d <__abi_tag+0x9591>
   95f1f:	vpbroadcastb -0x8c69a(%rip),%ymm5        # 988e <__abi_tag+0x9592>
   95f28:	vpbroadcastb -0x8c6a2(%rip),%ymm6        # 988f <__abi_tag+0x9593>
   95f31:	mov    0xf8(%rsp),%rbx
   95f39:	cmp    %rbx,%rax
   95f3c:	jb     93e6e <sessions::fast::parse_events_avx2+0x26ce>
   95f42:	mov    %rbp,%rdi
   95f45:	vzeroupper
   95f48:	call   *0xe9a82(%rip)        # 17f9d0 <free@GLIBC_2.2.5>
   95f4e:	jmp    95f5c <sessions::fast::parse_events_avx2+0x47bc>
   95f50:	xor    %r15d,%r15d
   95f53:	sub    %r15,%rdx
   95f56:	ja     93d04 <sessions::fast::parse_events_avx2+0x2564>
   95f5c:	mov    0x130(%rsp),%rax
   95f64:	add    $0x198,%rsp
   95f6b:	pop    %rbx
   95f6c:	pop    %r12
   95f6e:	pop    %r13
   95f70:	pop    %r14
   95f72:	pop    %r15
   95f74:	pop    %rbp
   95f75:	vzeroupper
   95f78:	ret
   95f79:	mov    $0x1,%edi
   95f7e:	mov    %rbx,%rsi
   95f81:	call   b2c83 <alloc::raw_vec::handle_error>
   95f86:	lea    0xe526b(%rip),%rdx        # 17b1f8 <__frame_dummy_init_array_entry+0x978>
   95f8d:	call   b58fb <core::panicking::panic_bounds_check>
   95f92:	lea    0xe5277(%rip),%rdx        # 17b210 <__frame_dummy_init_array_entry+0x990>
   95f99:	call   b58fb <core::panicking::panic_bounds_check>
   95f9e:	int3
   95f9f:	int3

