0000000000091480 <sessions::fast::parse_events_avx2>:
   91480:	push   %rbp
   91481:	push   %r15
   91483:	push   %r14
   91485:	push   %r13
   91487:	push   %r12
   91489:	push   %rbx
   9148a:	sub    $0x148,%rsp
   91491:	mov    %rcx,0x130(%rsp)
   91499:	mov    %rdx,%r14
   9149c:	mov    %rdi,0xf8(%rsp)
   914a4:	mov    %r8,0x100(%rsp)
   914ac:	mov    %r9,0x108(%rsp)
   914b4:	movq   $0x0,0x110(%rsp)
   914c0:	cmp    $0xa0,%rdx
   914c7:	mov    $0xa0,%r15d
   914cd:	cmovb  %rdx,%r15
   914d1:	mov    %r15,%rax
   914d4:	not    %rax
   914d7:	mov    %rsi,0xf0(%rsp)
   914df:	add    %rsi,%rax
   914e2:	neg    %r15
   914e5:	xor    %ebp,%ebp
   914e7:	nopw   0x0(%rax,%rax,1)
   914f0:	mov    %r14,%rdx
   914f3:	add    %r15,%rdx
   914f6:	je     9364c <sessions::fast::parse_events_avx2+0x21cc>
   914fc:	mov    %r15,%rcx
   914ff:	cmpb   $0xa,(%rax,%r14,1)
   91504:	lea    -0x1(%rax),%rax
   91508:	lea    -0x1(%r15),%r15
   9150c:	jne    914f0 <sessions::fast::parse_events_avx2+0x70>
   9150e:	lea    (%r14,%rcx,1),%rbp
   91512:	dec    %rbp
   91515:	inc    %rbp
   91518:	je     9364a <sessions::fast::parse_events_avx2+0x21ca>
   9151e:	mov    0x130(%rsp),%rax
   91526:	mov    0x8(%rax),%rcx
   9152a:	mov    0x20(%rax),%rdx
   9152e:	mov    %rdx,0x40(%rsp)
   91533:	mov    0x38(%rax),%r9
   91537:	mov    0x50(%rax),%rax
   9153b:	mov    %rax,0xc0(%rsp)
   91543:	add    %r14,%r15
   91546:	vmovdqa -0x885de(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   9154e:	vmovdqa -0x88936(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   91556:	vmovdqa -0x88d9e(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   9155e:	vmovdqa -0x88a86(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   91566:	vmovdqa -0x8926e(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   9156e:	vmovdqa -0x89536(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   91576:	vmovdqa -0x88cfe(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   9157e:	vmovdqa -0x89636(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   91586:	vpbroadcastb -0x87e89(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   9158f:	mov    %rcx,0xb8(%rsp)
   91597:	lea    0x40(%rcx),%rax
   9159b:	mov    %rax,0x120(%rsp)
   915a3:	xor    %ecx,%ecx
   915a5:	vpbroadcastb -0x87ea7(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   915ae:	vpbroadcastb -0x87eaf(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   915b7:	mov    %r14,0xc8(%rsp)
   915bf:	mov    %rbp,0xd0(%rsp)
   915c7:	mov    %r15,0x140(%rsp)
   915cf:	mov    %r9,0x48(%rsp)
   915d4:	jmp    91617 <sessions::fast::parse_events_avx2+0x197>
   915d6:	cs nopw 0x0(%rax,%rax,1)
   915e0:	mov    0xe0(%rsp),%rax
   915e8:	mov    %rax,0x110(%rsp)
   915f0:	mov    %r14d,%eax
   915f3:	mov    0xb0(%rsp),%rcx
   915fb:	add    %rax,%rcx
   915fe:	mov    0xd0(%rsp),%rbp
   91606:	mov    0xc8(%rsp),%r14
   9160e:	cmp    %rbp,%rcx
   91611:	jae    9364c <sessions::fast::parse_events_avx2+0x21cc>
   91617:	mov    %rbp,%rdx
   9161a:	sub    %rcx,%rdx
   9161d:	cmp    $0x8000,%rdx
   91624:	mov    $0x8000,%r10d
   9162a:	cmovb  %rdx,%r10
   9162e:	mov    0xf0(%rsp),%rax
   91636:	add    %rcx,%rax
   91639:	mov    %rax,0x10(%rsp)
   9163e:	mov    %rdx,0x78(%rsp)
   91643:	test   %rdx,%rdx
   91646:	mov    %rcx,0xb0(%rsp)
   9164e:	je     91910 <sessions::fast::parse_events_avx2+0x490>
   91654:	mov    $0xffffffffffffffff,%rax
   9165b:	shlx   %r10,%rax,%rax
   91660:	not    %rax
   91663:	mov    %rax,0x60(%rsp)
   91668:	xor    %r11d,%r11d
   9166b:	xor    %edx,%edx
   9166d:	xor    %r12d,%r12d
   91670:	xor    %edi,%edi
   91672:	mov    0x40(%rsp),%r15
   91677:	mov    %r10,0x8(%rsp)
   9167c:	jmp    916a2 <sessions::fast::parse_events_avx2+0x222>
   9167e:	xchg   %ax,%ax
   91680:	add    %r10,%r11
   91683:	popcnt %r9,%rax
   91688:	add    %eax,%edx
   9168a:	mov    0x8(%rsp),%r10
   9168f:	mov    0x38(%rsp),%rdi
   91694:	cmp    %r10,%rdi
   91697:	mov    0x40(%rsp),%r15
   9169c:	jae    918e0 <sessions::fast::parse_events_avx2+0x460>
   916a2:	mov    0x10(%rsp),%rax
   916a7:	vmovdqu (%rax,%rdi,1),%ymm0
   916ac:	vmovdqu 0x20(%rax,%rdi,1),%ymm1
   916b2:	vpcmpeqb %ymm4,%ymm0,%ymm2
   916b6:	vpmovmskb %ymm2,%r8d
   916ba:	vpcmpeqb %ymm4,%ymm1,%ymm2
   916be:	vpmovmskb %ymm2,%ebx
   916c2:	shl    $0x20,%rbx
   916c6:	or     %r8,%rbx
   916c9:	vpcmpeqb %ymm5,%ymm0,%ymm2
   916cd:	vpmovmskb %ymm2,%r8d
   916d1:	vpcmpeqb %ymm5,%ymm1,%ymm2
   916d5:	vpmovmskb %ymm2,%eax
   916d9:	shl    $0x20,%rax
   916dd:	or     %r8,%rax
   916e0:	vpcmpeqb %ymm6,%ymm0,%ymm0
   916e4:	vpmovmskb %ymm0,%r8d
   916e8:	vpcmpeqb %ymm6,%ymm1,%ymm0
   916ec:	vpmovmskb %ymm0,%r9d
   916f0:	shl    $0x20,%r9
   916f4:	or     %r8,%r9
   916f7:	lea    0x40(%rdi),%rcx
   916fb:	mov    %rcx,0x38(%rsp)
   91700:	cmp    %r10,%rcx
   91703:	mov    $0xffffffffffffffff,%r13
   9170a:	cmova  0x60(%rsp),%r13
   91710:	mov    %r11,%r10
   91713:	and    %r13,%r9
   91716:	and    %r13,%rbx
   91719:	and    %rax,%r13
   9171c:	mov    0x48(%rsp),%r8
   91721:	mov    0xc0(%rsp),%r11
   91729:	je     91766 <sessions::fast::parse_events_avx2+0x2e6>
   9172b:	nopl   0x0(%rax,%rax,1)
   91730:	tzcnt  %r13,%rax
   91735:	bzhi   %rax,%rbx,%rcx
   9173a:	bzhi   %rax,%r9,%rsi
   9173f:	or     %edi,%eax
   91741:	mov    %eax,(%r15,%r12,4)
   91745:	popcnt %rcx,%rax
   9174a:	add    %r10d,%eax
   9174d:	mov    %eax,(%r8,%r12,4)
   91751:	popcnt %rsi,%rax
   91756:	add    %edx,%eax
   91758:	mov    %eax,(%r11,%r12,4)
   9175c:	inc    %r12
   9175f:	blsr   %r13,%r13
   91764:	jne    91730 <sessions::fast::parse_events_avx2+0x2b0>
   91766:	blsr   %rbx,%rax
   9176b:	blsr   %rax,%r11
   91770:	blsr   %r11,%r15
   91775:	blsr   %r15,%rsi
   9177a:	blsr   %rsi,%r14
   9177f:	blsr   %r14,%rbp
   91784:	blsr   %rbp,%r13
   91789:	tzcnt  %r13,%rcx
   9178e:	tzcnt  %rbp,%rbp
   91793:	tzcnt  %r14,%r14
   91798:	tzcnt  %r15,%r15
   9179d:	tzcnt  %r11,%r11
   917a2:	tzcnt  %rax,%rax
   917a7:	tzcnt  %rbx,%r8
   917ac:	vmovd  %r8d,%xmm0
   917b1:	vpinsrd $0x1,%eax,%xmm0,%xmm0
   917b7:	vpinsrd $0x2,%r11d,%xmm0,%xmm0
   917bd:	vpinsrd $0x3,%r15d,%xmm0,%xmm0
   917c3:	tzcnt  %rsi,%rax
   917c8:	vmovd  %eax,%xmm1
   917cc:	vpinsrd $0x1,%r14d,%xmm1,%xmm1
   917d2:	vpinsrd $0x2,%ebp,%xmm1,%xmm1
   917d8:	vpinsrd $0x3,%ecx,%xmm1,%xmm1
   917de:	vinserti128 $0x1,%xmm1,%ymm0,%ymm1
   917e4:	vmovd  %edi,%xmm0
   917e8:	vpbroadcastd %xmm0,%ymm0
   917ed:	vpaddd %ymm0,%ymm1,%ymm1
   917f1:	mov    0xb8(%rsp),%rax
   917f9:	vmovdqu %ymm1,(%rax,%r10,4)
   917ff:	popcnt %rbx,%r11
   91804:	cmp    $0x9,%r11
   91808:	jb     91680 <sessions::fast::parse_events_avx2+0x200>
   9180e:	blsr   %r13,%rax
   91813:	blsr   %rax,%rcx
   91818:	blsr   %rcx,%rsi
   9181d:	blsr   %rsi,%r8
   91822:	blsr   %r8,%rbx
   91827:	blsr   %rbx,%r14
   9182c:	blsr   %r14,%r15
   91831:	blsr   %r15,%r13
   91836:	tzcnt  %r13,%rbp
   9183b:	tzcnt  %r15,%r15
   91840:	tzcnt  %r14,%r14
   91845:	tzcnt  %r8,%r8
   9184a:	tzcnt  %rsi,%rsi
   9184f:	tzcnt  %rcx,%rcx
   91854:	tzcnt  %rax,%rax
   91859:	vmovd  %eax,%xmm1
   9185d:	vpinsrd $0x1,%ecx,%xmm1,%xmm1
   91863:	vpinsrd $0x2,%esi,%xmm1,%xmm1
   91869:	vpinsrd $0x3,%r8d,%xmm1,%xmm1
   9186f:	tzcnt  %rbx,%rax
   91874:	vmovd  %eax,%xmm2
   91878:	vpinsrd $0x1,%r14d,%xmm2,%xmm2
   9187e:	vpinsrd $0x2,%r15d,%xmm2,%xmm2
   91884:	vpinsrd $0x3,%ebp,%xmm2,%xmm2
   9188a:	vinserti128 $0x1,%xmm2,%ymm1,%ymm1
   91890:	vpaddd %ymm0,%ymm1,%ymm0
   91894:	mov    0xb8(%rsp),%rax
   9189c:	vmovdqu %ymm0,0x20(%rax,%r10,4)
   918a3:	blsr   %r13,%rbx
   918a8:	je     91680 <sessions::fast::parse_events_avx2+0x200>
   918ae:	mov    0x120(%rsp),%rax
   918b6:	lea    (%rax,%r10,4),%r13
   918ba:	nopw   0x0(%rax,%rax,1)
   918c0:	tzcnt  %rbx,%rax
   918c5:	or     %edi,%eax
   918c7:	mov    %eax,0x0(%r13)
   918cb:	add    $0x4,%r13
   918cf:	blsr   %rbx,%rbx
   918d4:	jne    918c0 <sessions::fast::parse_events_avx2+0x440>
   918d6:	jmp    91680 <sessions::fast::parse_events_avx2+0x200>
   918db:	nopl   0x0(%rax,%rax,1)
   918e0:	mov    0xc8(%rsp),%r14
   918e8:	mov    0xd0(%rsp),%rbp
   918f0:	mov    0xb0(%rsp),%rcx
   918f8:	lea    (%r10,%rcx,1),%rsi
   918fc:	cmp    %rbp,%rsi
   918ff:	je     91926 <sessions::fast::parse_events_avx2+0x4a6>
   91901:	jmp    91937 <sessions::fast::parse_events_avx2+0x4b7>
   91903:	data16 data16 data16 cs nopw 0x0(%rax,%rax,1)
   91910:	xor    %r12d,%r12d
   91913:	xor    %edx,%edx
   91915:	xor    %r11d,%r11d
   91918:	mov    0x40(%rsp),%r15
   9191d:	lea    (%r10,%rcx,1),%rsi
   91921:	cmp    %rbp,%rsi
   91924:	jne    91937 <sessions::fast::parse_events_avx2+0x4b7>
   91926:	mov    0x10(%rsp),%rax
   9192b:	cmpb   $0xa,-0x1(%rax,%r10,1)
   91931:	jne    93570 <sessions::fast::parse_events_avx2+0x20f0>
   91937:	mov    0x48(%rsp),%r9
   9193c:	test   %r12,%r12
   9193f:	je     93595 <sessions::fast::parse_events_avx2+0x2115>
   91945:	mov    0x110(%rsp),%rax
   9194d:	mov    %rax,0xe0(%rsp)
   91955:	mov    0xf8(%rsp),%rax
   9195d:	mov    %rax,0x20(%rsp)
   91962:	mov    0x100(%rsp),%rax
   9196a:	mov    %rax,0xe8(%rsp)
   91972:	mov    0x108(%rsp),%rdi
   9197a:	xor    %r14d,%r14d
   9197d:	xor    %esi,%esi
   9197f:	xor    %r8d,%r8d
   91982:	xor    %r13d,%r13d
   91985:	mov    %rdi,0xd8(%rsp)
   9198d:	jmp    919b7 <sessions::fast::parse_events_avx2+0x537>
   9198f:	mov    0x40(%rsp),%r15
   91994:	mov    0x48(%rsp),%r9
   91999:	mov    0x78(%rsp),%rsi
   9199e:	mov    0x54(%rsp),%r8d
   919a3:	mov    0x2c(%rsp),%r13d
   919a8:	inc    %rsi
   919ab:	inc    %r14d
   919ae:	cmp    %r12,%rsi
   919b1:	je     915e0 <sessions::fast::parse_events_avx2+0x160>
   919b7:	mov    %r13d,%ebx
   919ba:	mov    %r8d,%ecx
   919bd:	mov    %r14d,%eax
   919c0:	mov    (%r15,%rsi,4),%r14d
   919c4:	mov    (%r9,%rsi,4),%r8d
   919c8:	mov    0xc0(%rsp),%rdx
   919d0:	mov    (%rdx,%rsi,4),%r13d
   919d4:	cmp    %eax,%r14d
   919d7:	jbe    919a8 <sessions::fast::parse_events_avx2+0x528>
   919d9:	mov    %r8d,%edx
   919dc:	sub    %ecx,%edx
   919de:	cmp    $0x6,%edx
   919e1:	jne    919a8 <sessions::fast::parse_events_avx2+0x528>
   919e3:	mov    %eax,%r11d
   919e6:	mov    %r8d,0x54(%rsp)
   919eb:	mov    %rsi,0x78(%rsp)
   919f0:	mov    %ecx,%ecx
   919f2:	mov    0xb8(%rsp),%r9
   919fa:	vmovdqu (%r9,%rcx,4),%xmm7
   91a00:	mov    0xc(%r9,%rcx,4),%edx
   91a05:	mov    0x8(%r9,%rcx,4),%esi
   91a0a:	mov    (%r9,%rcx,4),%r10d
   91a0e:	mov    0x4(%r9,%rcx,4),%r8d
   91a13:	lea    0x1(%r10),%ebp
   91a17:	lea    0x1(%r8),%eax
   91a1b:	mov    %eax,0x58(%rsp)
   91a1f:	lea    0x1(%rsi),%eax
   91a22:	mov    %eax,0x60(%rsp)
   91a26:	lea    0x1(%rdx),%eax
   91a29:	mov    %eax,0x38(%rsp)
   91a2d:	mov    0x10(%r9,%rcx,4),%eax
   91a32:	lea    0x1(%rax),%edi
   91a35:	mov    0x14(%r9,%rcx,4),%r9d
   91a3a:	lea    0x1(%r9),%ecx
   91a3e:	mov    %ecx,0x8(%rsp)
   91a42:	mov    %r13d,%ecx
   91a45:	sub    %ebx,%ecx
   91a47:	jne    91a80 <sessions::fast::parse_events_avx2+0x600>
   91a49:	mov    %rax,0xa8(%rsp)
   91a51:	mov    %r14d,%ecx
   91a54:	mov    0x8(%rsp),%r10d
   91a59:	mov    0x38(%rsp),%eax
   91a5d:	mov    0x60(%rsp),%r8d
   91a62:	vmovd  %xmm7,%esi
   91a66:	sub    %r11d,%esi
   91a69:	jne    91ca5 <sessions::fast::parse_events_avx2+0x825>
   91a6f:	mov    0x78(%rsp),%rsi
   91a74:	mov    0x54(%rsp),%r8d
   91a79:	jmp    926c0 <sessions::fast::parse_events_avx2+0x1240>
   91a7e:	xchg   %ax,%ax
   91a80:	mov    %r13d,0x2c(%rsp)
   91a85:	mov    %r9,0x30(%rsp)
   91a8a:	mov    %r11d,%r9d
   91a8d:	mov    %ebp,%ebx
   91a8f:	mov    %edi,%ebp
   91a91:	mov    %r10d,%edi
   91a94:	cmp    $0x1,%r10d
   91a98:	adc    $0xffffffffffffffff,%rdi
   91a9c:	mov    %r11d,0xa8(%rsp)
   91aa4:	vpinsrd $0x3,%r11d,%xmm7,%xmm0
   91aaa:	vpshufd $0x93,%xmm0,%xmm0
   91aaf:	mov    %ebx,0x1c(%rsp)
   91ab3:	mov    %ebx,%r10d
   91ab6:	mov    %r8d,%r11d
   91ab9:	cmp    $0x1,%r8d
   91abd:	adc    $0xffffffffffffffff,%r11
   91ac1:	mov    0x58(%rsp),%r8d
   91ac6:	mov    %esi,%ebx
   91ac8:	cmp    $0x1,%esi
   91acb:	adc    $0xffffffffffffffff,%rbx
   91acf:	mov    0x60(%rsp),%esi
   91ad3:	mov    %edx,%r13d
   91ad6:	cmp    $0x1,%edx
   91ad9:	adc    $0xffffffffffffffff,%r13
   91add:	mov    0x10(%rsp),%r15
   91ae2:	movzbl (%r15,%r9,1),%r9d
   91ae7:	vmovd  %r9d,%xmm1
   91aec:	vpinsrb $0x1,(%r15,%r10,1),%xmm1,%xmm1
   91af3:	vpinsrb $0x2,(%r15,%r8,1),%xmm1,%xmm1
   91afa:	vpinsrb $0x3,(%r15,%rsi,1),%xmm1,%xmm1
   91b01:	vpaddd -0x89019(%rip),%xmm0,%xmm0        # 8af0 <__abi_tag+0x87f4>
   91b09:	vmovdqa -0x89b41(%rip),%xmm3        # 7fd0 <__abi_tag+0x7cd4>
   91b11:	vpcmpeqb %xmm3,%xmm1,%xmm1
   91b15:	movzbl (%r15,%rdi,1),%esi
   91b1a:	vmovd  %esi,%xmm2
   91b1e:	vpinsrb $0x1,(%r15,%r11,1),%xmm2,%xmm2
   91b25:	vpinsrb $0x2,(%r15,%rbx,1),%xmm2,%xmm2
   91b2c:	vpinsrb $0x3,(%r15,%r13,1),%xmm2,%xmm2
   91b33:	vpcmpeqb %xmm3,%xmm2,%xmm2
   91b37:	vpand  %xmm2,%xmm1,%xmm1
   91b3b:	vpmaxud %xmm0,%xmm7,%xmm0
   91b40:	vpcmpeqd %xmm0,%xmm7,%xmm0
   91b44:	vpmovsxbd %xmm1,%xmm1
   91b49:	vpand  %xmm0,%xmm1,%xmm0
   91b4d:	vpsrld $0x1f,%xmm0,%xmm1
   91b52:	vmovd  %xmm1,%edi
   91b56:	vpextrd $0x1,%xmm1,%r9d
   91b5c:	vpextrd $0x2,%xmm1,%esi
   91b62:	vpextrd $0x3,%xmm1,%r8d
   91b68:	mov    %r9,0xa0(%rsp)
   91b70:	lea    (%rsi,%r8,1),%r10d
   91b74:	add    %edi,%r10d
   91b77:	add    %r9d,%r10d
   91b7a:	mov    0x38(%rsp),%r11d
   91b7f:	movzbl (%r15,%r11,1),%r11d
   91b84:	xor    $0x22,%r11b
   91b88:	cmp    $0x1,%rax
   91b8c:	mov    %rax,%rbx
   91b8f:	adc    $0xffffffffffffffff,%rbx
   91b93:	movzbl (%r15,%rbx,1),%ebx
   91b98:	xor    $0x22,%bl
   91b9b:	add    $0x3,%edx
   91b9e:	cmp    %edx,%eax
   91ba0:	setae  %dl
   91ba3:	or     %r11b,%bl
   91ba6:	sete   %r11b
   91baa:	and    %dl,%r11b
   91bad:	movzbl %r11b,%edx
   91bb1:	mov    %ebp,0x50(%rsp)
   91bb5:	mov    %ebp,%r11d
   91bb8:	movzbl (%r15,%r11,1),%r11d
   91bbd:	xor    $0x22,%r11b
   91bc1:	mov    0x30(%rsp),%r9
   91bc6:	cmp    $0x1,%r9
   91bca:	mov    %r9,%rbx
   91bcd:	adc    $0xffffffffffffffff,%rbx
   91bd1:	movzbl (%r15,%rbx,1),%ebx
   91bd6:	xor    $0x22,%bl
   91bd9:	lea    0x3(%rax),%r13d
   91bdd:	cmp    %r13d,%r9d
   91be0:	setae  %r13b
   91be4:	or     %r11b,%bl
   91be7:	sete   %r11b
   91beb:	and    %r13b,%r11b
   91bee:	movzbl %r11b,%r11d
   91bf2:	mov    0x8(%rsp),%ebx
   91bf6:	movzbl (%r15,%rbx,1),%ebx
   91bfb:	xor    $0x22,%bl
   91bfe:	movzbl -0x1(%r15,%r14,1),%r13d
   91c04:	xor    $0x22,%r13b
   91c08:	lea    0x3(%r9),%r15d
   91c0c:	cmp    %r15d,%r14d
   91c0f:	setae  %r15b
   91c13:	or     %bl,%r13b
   91c16:	lea    (%rdx,%r11,1),%r13d
   91c1a:	sete   %bl
   91c1d:	and    %r15b,%bl
   91c20:	movzbl %bl,%ebx
   91c23:	add    %ebx,%r13d
   91c26:	add    %r10d,%r13d
   91c29:	add    %r13d,%r13d
   91c2c:	cmp    %ecx,%r13d
   91c2f:	jne    9198f <sessions::fast::parse_events_avx2+0x50f>
   91c35:	mov    0xa8(%rsp),%r13d
   91c3d:	add    %edi,%r13d
   91c40:	mov    0x1c(%rsp),%ebp
   91c44:	add    0xa0(%rsp),%ebp
   91c4b:	add    %esi,0x58(%rsp)
   91c4f:	mov    0x60(%rsp),%esi
   91c53:	add    %r8d,%esi
   91c56:	mov    0x38(%rsp),%r8d
   91c5b:	add    %edx,%r8d
   91c5e:	sub    %edx,%eax
   91c60:	mov    %rax,0xa8(%rsp)
   91c68:	mov    0x50(%rsp),%edi
   91c6c:	add    %r11d,%edi
   91c6f:	sub    %r11d,%r9d
   91c72:	mov    0x8(%rsp),%r10d
   91c77:	add    %ebx,%r10d
   91c7a:	mov    %r14d,%ecx
   91c7d:	sub    %ebx,%ecx
   91c7f:	vpaddd %xmm0,%xmm7,%xmm7
   91c83:	mov    0x40(%rsp),%r15
   91c88:	mov    0x2c(%rsp),%edx
   91c8c:	mov    %r8d,%eax
   91c8f:	mov    %esi,%r8d
   91c92:	mov    %r13d,%r11d
   91c95:	mov    %edx,%r13d
   91c98:	vmovd  %xmm7,%esi
   91c9c:	sub    %r11d,%esi
   91c9f:	je     91a6f <sessions::fast::parse_events_avx2+0x5ef>
   91ca5:	vmovdqa %xmm7,0x60(%rsp)
   91cab:	mov    %rcx,0x118(%rsp)
   91cb3:	mov    %eax,0x38(%rsp)
   91cb7:	mov    %edi,0x50(%rsp)
   91cbb:	mov    %ebp,0x1c(%rsp)
   91cbf:	mov    %r11d,%edi
   91cc2:	cmp    $0xa,%esi
   91cc5:	ja     924d1 <sessions::fast::parse_events_avx2+0x1051>
   91ccb:	mov    0x10(%rsp),%rax
   91cd0:	vmovdqu (%rax,%rdi,1),%xmm1
   91cd5:	vmovd  %esi,%xmm0
   91cd9:	vpbroadcastb %xmm0,%xmm0
   91cde:	vpcmpgtb %xmm8,%xmm0,%xmm0
   91ce3:	vpaddb %xmm1,%xmm9,%xmm2
   91ce7:	vpminub %xmm2,%xmm10,%xmm3
   91ceb:	vpcmpeqb %xmm3,%xmm2,%xmm2
   91cef:	vpaddb %xmm1,%xmm11,%xmm3
   91cf3:	vpminub %xmm3,%xmm12,%xmm4
   91cf7:	vpcmpeqb %xmm4,%xmm3,%xmm3
   91cfb:	vpaddb %xmm1,%xmm13,%xmm4
   91cff:	vpminub %xmm4,%xmm12,%xmm5
   91d03:	vpcmpeqb %xmm5,%xmm4,%xmm5
   91d07:	vpcmpeqb %xmm1,%xmm14,%xmm4
   91d0b:	vpor   %xmm2,%xmm3,%xmm6
   91d0f:	vpor   %xmm5,%xmm4,%xmm7
   91d13:	vpor   %xmm6,%xmm7,%xmm6
   91d17:	vpandn %xmm0,%xmm6,%xmm6
   91d1b:	vpmovmskb %xmm6,%eax
   91d1f:	test   %eax,%eax
   91d21:	jne    924d1 <sessions::fast::parse_events_avx2+0x1051>
   91d27:	vpaddb %xmm1,%xmm15,%xmm6
   91d2b:	vpand  %xmm6,%xmm5,%xmm5
   91d2f:	vpaddb -0x88e77(%rip),%xmm1,%xmm6        # 8ec0 <__abi_tag+0x8bc4>
   91d37:	vpand  %xmm6,%xmm3,%xmm3
   91d3b:	vpaddb -0x898b3(%rip),%xmm1,%xmm1        # 8490 <__abi_tag+0x8194>
   91d43:	vpand  %xmm1,%xmm2,%xmm1
   91d47:	vpor   %xmm3,%xmm1,%xmm1
   91d4b:	vpand  -0x894c3(%rip),%xmm4,%xmm2        # 8890 <__abi_tag+0x8594>
   91d53:	vpor   %xmm2,%xmm5,%xmm2
   91d57:	vpor   %xmm1,%xmm2,%xmm1
   91d5b:	vpand  %xmm1,%xmm0,%xmm0
   91d5f:	vpmaddubsw -0x89e08(%rip),%xmm0,%xmm0        # 7f60 <__abi_tag+0x7c64>
   91d68:	vpmaddwd -0x894d0(%rip),%xmm0,%xmm0        # 88a0 <__abi_tag+0x85a4>
   91d70:	vpextrd $0x1,%xmm0,%eax
   91d76:	vmovd  %xmm0,%ecx
   91d7a:	vpextrd $0x2,%xmm0,%ebp
   91d80:	shl    $0x24,%rcx
   91d84:	shl    $0xc,%rax
   91d88:	or     %rcx,%rax
   91d8b:	shr    $0xc,%ebp
   91d8e:	or     %rax,%rbp
   91d91:	mov    %r8d,%ebx
   91d94:	vmovdqa 0x60(%rsp),%xmm0
   91d9a:	vpextrd $0x3,%xmm0,%eax
   91da0:	add    0x10(%rsp),%rbx
   91da5:	mov    %eax,%ecx
   91da7:	sub    %r8d,%ecx
   91daa:	cmp    $0x19,%rcx
   91dae:	mov    %r14,0xa0(%rsp)
   91db6:	mov    %r13d,0x2c(%rsp)
   91dbb:	mov    %rbp,0x128(%rsp)
   91dc3:	je     91f66 <sessions::fast::parse_events_avx2+0xae6>
   91dc9:	cmp    $0x14,%ecx
   91dcc:	vpbroadcastb -0x886cf(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   91dd5:	vpbroadcastb -0x886d7(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   91dde:	jne    921b5 <sessions::fast::parse_events_avx2+0xd35>
   91de4:	cmpb   $0x5a,0x13(%rbx)
   91de8:	vpbroadcastb -0x886e9(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   91df1:	jne    922b4 <sessions::fast::parse_events_avx2+0xe34>
   91df7:	mov    %r10d,%r14d
   91dfa:	mov    %r9,0x30(%rsp)
   91dff:	mov    (%rbx),%rdx
   91e02:	mov    0x20(%rsp),%rsi
   91e07:	mov    0x8e0(%rsi),%rax
   91e0e:	imul   %rdx,%rax
   91e12:	shr    $0x3c,%rax
   91e16:	cmp    %rdx,0x698(%rsi,%rax,8)
   91e1e:	jne    93140 <sessions::fast::parse_events_avx2+0x1cc0>
   91e24:	mov    0x718(%rsi,%rax,8),%rcx
   91e2c:	mov    0x798(%rsi,%rax,8),%rdx
   91e34:	movzwl 0x8(%rbx),%esi
   91e38:	xor    $0x3030,%rsi
   91e3f:	mov    0xb(%rbx),%rdi
   91e43:	mov    %rdi,%rax
   91e46:	movabs $0x3030303030303030,%r8
   91e50:	xor    %r8,%rax
   91e53:	lea    0x7676(%rsi),%r8d
   91e5a:	or     %esi,%r8d
   91e5d:	and    $0x8080,%r8d
   91e64:	movabs $0x7676767676767676,%r9
   91e6e:	add    %rax,%r9
   91e71:	or     %rdi,%r9
   91e74:	movabs $0x8080008080008080,%r10
   91e7e:	and    %r10,%r9
   91e81:	xor    %r10d,%r10d
   91e84:	cmpb   $0x54,0xa(%rbx)
   91e88:	setne  %r10b
   91e8c:	movabs $0xff0000ff0000,%r11
   91e96:	and    %r11,%rdi
   91e99:	or     %r10,%rdi
   91e9c:	or     %r9,%rdi
   91e9f:	or     %r8,%rdi
   91ea2:	movabs $0x3a00003a0000,%r8
   91eac:	cmp    %r8,%rdi
   91eaf:	jne    92299 <sessions::fast::parse_events_avx2+0xe19>
   91eb5:	lea    (%rax,%rax,4),%rdi
   91eb9:	shr    $0x8,%rax
   91ebd:	lea    (%rax,%rdi,2),%r9
   91ec1:	mov    %r9,%rax
   91ec4:	shr    $0x30,%rax
   91ec8:	movzbl %al,%edi
   91ecb:	xor    %eax,%eax
   91ecd:	cmp    $0x3b,%rdi
   91ed1:	ja     9253c <sessions::fast::parse_events_avx2+0x10bc>
   91ed7:	mov    %r9d,%r8d
   91eda:	shr    $0x18,%r8d
   91ede:	cmp    $0x3b,%r8d
   91ee2:	ja     9253c <sessions::fast::parse_events_avx2+0x10bc>
   91ee8:	mov    $0xffffffff,%ebp
   91eed:	movzbl %r9b,%ebx
   91ef1:	cmp    $0x17,%ebx
   91ef4:	ja     925bd <sessions::fast::parse_events_avx2+0x113d>
   91efa:	movzbl %sil,%r10d
   91efe:	lea    (%r10,%r10,4),%r10
   91f02:	shr    $0x8,%esi
   91f05:	lea    (%rsi,%r10,2),%rsi
   91f09:	test   %rsi,%rsi
   91f0c:	je     925bd <sessions::fast::parse_events_avx2+0x113d>
   91f12:	movabs $0x7fffffffffffffff,%r10
   91f1c:	mov    $0x0,%r9d
   91f22:	cmp    %rdx,%rsi
   91f25:	jg     925ca <sessions::fast::parse_events_avx2+0x114a>
   91f2b:	add    %rcx,%rsi
   91f2e:	imul   $0x15180,%rsi,%rax
   91f35:	imul   $0xe10,%rbx,%rcx
   91f3c:	imul   $0x3c,%r8,%rdx
   91f40:	add    %rdi,%rcx
   91f43:	add    %rdx,%rcx
   91f46:	add    %rax,%rcx
   91f49:	imul   $0x3e8,%rcx,%rax
   91f50:	add    $0xfffffffffad9a400,%rax
   91f56:	mov    0x30(%rsp),%r9
   91f5b:	mov    %r14d,%r10d
   91f5e:	mov    %rax,%r14
   91f61:	jmp    92317 <sessions::fast::parse_events_avx2+0xe97>
   91f66:	movzbl 0x13(%rbx),%r13d
   91f6b:	cmp    $0x2b,%r13d
   91f6f:	vpbroadcastb -0x88872(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   91f78:	vpbroadcastb -0x8887a(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   91f81:	vpbroadcastb -0x88882(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   91f8a:	je     91f96 <sessions::fast::parse_events_avx2+0xb16>
   91f8c:	cmp    $0x2d,%r13d
   91f90:	jne    922b4 <sessions::fast::parse_events_avx2+0xe34>
   91f96:	mov    %r10d,0x8(%rsp)
   91f9b:	mov    %r9,0x30(%rsp)
   91fa0:	mov    (%rbx),%rdx
   91fa3:	mov    0x20(%rsp),%rcx
   91fa8:	mov    0x8e0(%rcx),%rax
   91faf:	imul   %rdx,%rax
   91fb3:	shr    $0x3c,%rax
   91fb7:	cmp    %rdx,0x698(%rcx,%rax,8)
   91fbf:	jne    930a5 <sessions::fast::parse_events_avx2+0x1c25>
   91fc5:	mov    0x718(%rcx,%rax,8),%r11
   91fcd:	mov    0x798(%rcx,%rax,8),%rdi
   91fd5:	movzwl 0x8(%rbx),%r9d
   91fda:	xor    $0x3030,%r9
   91fe1:	mov    0xb(%rbx),%rdx
   91fe5:	mov    %rdx,%rax
   91fe8:	movabs $0x3030303030303030,%rcx
   91ff2:	xor    %rcx,%rax
   91ff5:	lea    0x7676(%r9),%ecx
   91ffc:	or     %r9d,%ecx
   91fff:	and    $0x8080,%ecx
   92005:	movabs $0x7676767676767676,%rsi
   9200f:	add    %rax,%rsi
   92012:	or     %rdx,%rsi
   92015:	movabs $0x8080008080008080,%r8
   9201f:	and    %r8,%rsi
   92022:	xor    %r8d,%r8d
   92025:	cmpb   $0x54,0xa(%rbx)
   92029:	setne  %r8b
   9202d:	movabs $0xff0000ff0000,%r10
   92037:	and    %r10,%rdx
   9203a:	or     %r8,%rdx
   9203d:	or     %rsi,%rdx
   92040:	or     %rcx,%rdx
   92043:	movabs $0x3a00003a0000,%rcx
   9204d:	cmp    %rcx,%rdx
   92050:	jne    92299 <sessions::fast::parse_events_avx2+0xe19>
   92056:	lea    (%rax,%rax,4),%rcx
   9205a:	shr    $0x8,%rax
   9205e:	lea    (%rax,%rcx,2),%rcx
   92062:	mov    %rcx,%rax
   92065:	shr    $0x30,%rax
   92069:	movzbl %al,%edx
   9206c:	xor    %eax,%eax
   9206e:	cmp    $0x3b,%rdx
   92072:	ja     9253c <sessions::fast::parse_events_avx2+0x10bc>
   92078:	mov    %ecx,%esi
   9207a:	shr    $0x18,%esi
   9207d:	cmp    $0x3b,%esi
   92080:	ja     9253c <sessions::fast::parse_events_avx2+0x10bc>
   92086:	movzbl %cl,%r8d
   9208a:	cmp    $0x17,%r8d
   9208e:	ja     9253c <sessions::fast::parse_events_avx2+0x10bc>
   92094:	movzbl %r9b,%ecx
   92098:	lea    (%rcx,%rcx,4),%rcx
   9209c:	shr    $0x8,%r9d
   920a0:	lea    (%r9,%rcx,2),%r14
   920a4:	test   %r14,%r14
   920a7:	je     9253c <sessions::fast::parse_events_avx2+0x10bc>
   920ad:	cmp    %rdi,%r14
   920b0:	jg     9253c <sessions::fast::parse_events_avx2+0x10bc>
   920b6:	cmpb   $0x3a,0x16(%rbx)
   920ba:	jne    92299 <sessions::fast::parse_events_avx2+0xe19>
   920c0:	mov    $0xffffffff,%ebp
   920c5:	movzbl 0x14(%rbx),%edi
   920c9:	add    $0xd0,%dil
   920cd:	xor    %eax,%eax
   920cf:	cmp    $0x9,%dil
   920d3:	ja     925bd <sessions::fast::parse_events_avx2+0x113d>
   920d9:	movzbl 0x15(%rbx),%r10d
   920de:	add    $0xd0,%r10b
   920e2:	cmp    $0x9,%r10b
   920e6:	ja     925bd <sessions::fast::parse_events_avx2+0x113d>
   920ec:	movzbl 0x17(%rbx),%ecx
   920f0:	add    $0xd0,%cl
   920f3:	cmp    $0x9,%cl
   920f6:	ja     925bd <sessions::fast::parse_events_avx2+0x113d>
   920fc:	mov    %r11,0x60(%rsp)
   92101:	movzbl 0x18(%rbx),%r11d
   92106:	add    $0xd0,%r11b
   9210a:	cmp    $0x9,%r11b
   9210e:	ja     925bd <sessions::fast::parse_events_avx2+0x113d>
   92114:	movzbl %dil,%eax
   92118:	add    %eax,%eax
   9211a:	lea    (%rax,%rax,4),%edi
   9211d:	add    %r10b,%dil
   92120:	xor    %eax,%eax
   92122:	cmp    $0x17,%dil
   92126:	ja     925bd <sessions::fast::parse_events_avx2+0x113d>
   9212c:	movzbl %cl,%ecx
   9212f:	add    %ecx,%ecx
   92131:	lea    (%rcx,%rcx,4),%ebx
   92134:	add    %r11b,%bl
   92137:	movabs $0x7fffffffffffffff,%r10
   92141:	mov    $0x0,%r9d
   92147:	cmp    $0x3b,%bl
   9214a:	ja     925ca <sessions::fast::parse_events_avx2+0x114a>
   92150:	add    0x60(%rsp),%r14
   92155:	imul   $0x15180,%r14,%rax
   9215c:	imul   $0xe10,%r8,%rcx
   92163:	imul   $0x3c,%rsi,%rsi
   92167:	add    %rdx,%rcx
   9216a:	add    %rsi,%rcx
   9216d:	add    %rax,%rcx
   92170:	imul   $0x3e8,%rcx,%rax
   92177:	add    $0xfffffffffad9a400,%rax
   9217d:	movzbl %bl,%ecx
   92180:	movzbl %dil,%edx
   92184:	imul   $0x36ee80,%rdx,%rdx
   9218b:	imul   $0xea60,%rcx,%rcx
   92192:	add    %rdx,%rcx
   92195:	mov    %rcx,%r14
   92198:	neg    %r14
   9219b:	cmp    $0x2b,%r13b
   9219f:	cmovne %rcx,%r14
   921a3:	add    %rax,%r14
   921a6:	mov    0x30(%rsp),%r9
   921ab:	mov    0x8(%rsp),%r10d
   921b0:	jmp    92317 <sessions::fast::parse_events_avx2+0xe97>
   921b5:	lea    -0x1(%rcx),%edx
   921b8:	cmp    $0x10,%edx
   921bb:	vpbroadcastb -0x88abc(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   921c4:	jae    922a3 <sessions::fast::parse_events_avx2+0xe23>
   921ca:	mov    %r10d,0x8(%rsp)
   921cf:	mov    %r9,%r14
   921d2:	cmp    $0x9,%ecx
   921d5:	jae    92543 <sessions::fast::parse_events_avx2+0x10c3>
   921db:	lea    0x0(,%rcx,8),%edx
   921e2:	xor    %eax,%eax
   921e4:	cmp    $0x8,%rcx
   921e8:	movabs $0x3030303030303030,%rsi
   921f2:	shrx   %rdx,%rsi,%rdx
   921f7:	cmove  %rax,%rdx
   921fb:	neg    %cl
   921fd:	shl    $0x3,%cl
   92200:	shlx   %rcx,(%rbx),%rcx
   92205:	or     %rcx,%rdx
   92208:	xor    %rsi,%rdx
   9220b:	movabs $0x7676767676767676,%rsi
   92215:	add    %rdx,%rsi
   92218:	or     %rcx,%rsi
   9221b:	mov    $0xffffffff,%ebp
   92220:	movabs $0x7fffffffffffffff,%r10
   9222a:	mov    $0x0,%r9d
   92230:	movabs $0x8080808080808080,%rcx
   9223a:	test   %rcx,%rsi
   9223d:	jne    925ca <sessions::fast::parse_events_avx2+0x114a>
   92243:	lea    (%rdx,%rdx,4),%rax
   92247:	shr    $0x8,%rdx
   9224b:	lea    (%rdx,%rax,2),%rsi
   9224f:	mov    %rsi,%rax
   92252:	movabs $0xff000000ff,%rdx
   9225c:	and    %rdx,%rax
   9225f:	movabs $0xf424000000064,%rcx
   92269:	imul   %rcx,%rax
   9226d:	shr    $0x10,%rsi
   92271:	and    %rdx,%rsi
   92274:	movabs $0x271000000001,%rcx
   9227e:	imul   %rcx,%rsi
   92282:	add    %rax,%rsi
   92285:	shr    $0x20,%rsi
   92289:	mov    %r14,%r9
   9228c:	mov    %rsi,%r14
   9228f:	mov    0x8(%rsp),%r10d
   92294:	jmp    92317 <sessions::fast::parse_events_avx2+0xe97>
   92299:	mov    $0xffffffff,%ebp
   9229e:	jmp    925bb <sessions::fast::parse_events_avx2+0x113b>
   922a3:	cmp    %r8d,%eax
   922a6:	jne    922b4 <sessions::fast::parse_events_avx2+0xe34>
   922a8:	xor    %eax,%eax
   922aa:	mov    $0xffffffff,%ebp
   922af:	jmp    925bd <sessions::fast::parse_events_avx2+0x113d>
   922b4:	xor    %edx,%edx
   922b6:	xor    %eax,%eax
   922b8:	xor    %esi,%esi
   922ba:	xor    %r14d,%r14d
   922bd:	nopl   (%rax)
   922c0:	movzbl (%rbx,%rdx,1),%edi
   922c4:	add    $0xd0,%dil
   922c8:	mov    $0xffffffff,%ebp
   922cd:	cmp    $0x9,%dil
   922d1:	ja     925bb <sessions::fast::parse_events_avx2+0x113b>
   922d7:	test   %dil,%dil
   922da:	setne  %r8b
   922de:	or     %r8b,%sil
   922e1:	movzbl %sil,%r8d
   922e5:	and    $0x1,%r8d
   922e9:	add    %r8d,%eax
   922ec:	lea    (%r14,%r14,4),%r8
   922f0:	movzbl %dil,%edi
   922f4:	lea    (%rdi,%r8,2),%r14
   922f8:	inc    %rdx
   922fb:	cmp    %rdx,%rcx
   922fe:	jne    922c0 <sessions::fast::parse_events_avx2+0xe40>
   92300:	cmp    $0x14,%eax
   92303:	setb   %al
   92306:	test   %r14,%r14
   92309:	setns  %cl
   9230c:	and    %al,%cl
   9230e:	cmp    $0x1,%cl
   92311:	jne    925bb <sessions::fast::parse_events_avx2+0x113b>
   92317:	vpextrd $0x1,%xmm0,%edi
   9231d:	mov    0x1c(%rsp),%r8d
   92322:	xor    %eax,%eax
   92324:	cmp    %r8d,%edi
   92327:	je     93012 <sessions::fast::parse_events_avx2+0x1b92>
   9232d:	mov    0x50(%rsp),%ecx
   92331:	cmp    %ecx,%r9d
   92334:	je     93012 <sessions::fast::parse_events_avx2+0x1b92>
   9233a:	mov    %rcx,0x60(%rsp)
   9233f:	mov    0x58(%rsp),%esi
   92343:	mov    %esi,%ebx
   92345:	vpextrd $0x2,%xmm0,%eax
   9234b:	add    0x10(%rsp),%rbx
   92350:	mov    %eax,%ecx
   92352:	sub    %esi,%ecx
   92354:	cmp    $0x19,%rcx
   92358:	je     926ca <sessions::fast::parse_events_avx2+0x124a>
   9235e:	cmp    $0x14,%ecx
   92361:	jne    928f2 <sessions::fast::parse_events_avx2+0x1472>
   92367:	cmpb   $0x5a,0x13(%rbx)
   9236b:	jne    929cc <sessions::fast::parse_events_avx2+0x154c>
   92371:	mov    %r8,0x80(%rsp)
   92379:	mov    %rdi,0x58(%rsp)
   9237e:	mov    %r10d,0x8(%rsp)
   92383:	mov    %r9,0x30(%rsp)
   92388:	mov    (%rbx),%rdx
   9238b:	mov    0x20(%rsp),%rsi
   92390:	mov    0x8e0(%rsi),%rax
   92397:	imul   %rdx,%rax
   9239b:	shr    $0x3c,%rax
   9239f:	cmp    %rdx,0x698(%rsi,%rax,8)
   923a7:	jne    932e0 <sessions::fast::parse_events_avx2+0x1e60>
   923ad:	mov    0x718(%rsi,%rax,8),%rcx
   923b5:	mov    0x798(%rsi,%rax,8),%rdx
   923bd:	movzwl 0x8(%rbx),%esi
   923c1:	xor    $0x3030,%rsi
   923c8:	mov    0xb(%rbx),%rdi
   923cc:	mov    %rdi,%rax
   923cf:	movabs $0x3030303030303030,%r8
   923d9:	xor    %r8,%rax
   923dc:	lea    0x7676(%rsi),%r8d
   923e3:	or     %esi,%r8d
   923e6:	and    $0x8080,%r8d
   923ed:	movabs $0x7676767676767676,%r9
   923f7:	add    %rax,%r9
   923fa:	or     %rdi,%r9
   923fd:	movabs $0x8080008080008080,%r10
   92407:	and    %r10,%r9
   9240a:	xor    %r10d,%r10d
   9240d:	cmpb   $0x54,0xa(%rbx)
   92411:	setne  %r10b
   92415:	movabs $0xff0000ff0000,%r11
   9241f:	and    %r11,%rdi
   92422:	or     %r10,%rdi
   92425:	or     %r9,%rdi
   92428:	or     %r8,%rdi
   9242b:	movabs $0x3a00003a0000,%r8
   92435:	cmp    %r8,%rdi
   92438:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   9243e:	lea    (%rax,%rax,4),%rdi
   92442:	shr    $0x8,%rax
   92446:	lea    (%rax,%rdi,2),%r9
   9244a:	mov    %r9,%rax
   9244d:	shr    $0x30,%rax
   92451:	movzbl %al,%edi
   92454:	xor    %eax,%eax
   92456:	cmp    $0x3b,%rdi
   9245a:	ja     93012 <sessions::fast::parse_events_avx2+0x1b92>
   92460:	mov    %r9d,%r8d
   92463:	shr    $0x18,%r8d
   92467:	cmp    $0x3b,%r8d
   9246b:	ja     93012 <sessions::fast::parse_events_avx2+0x1b92>
   92471:	movzbl %r9b,%r9d
   92475:	cmp    $0x17,%r9d
   92479:	ja     93012 <sessions::fast::parse_events_avx2+0x1b92>
   9247f:	movzbl %sil,%r10d
   92483:	lea    (%r10,%r10,4),%r10
   92487:	shr    $0x8,%esi
   9248a:	lea    (%rsi,%r10,2),%rsi
   9248e:	test   %rsi,%rsi
   92491:	je     93012 <sessions::fast::parse_events_avx2+0x1b92>
   92497:	cmp    %rdx,%rsi
   9249a:	jg     93012 <sessions::fast::parse_events_avx2+0x1b92>
   924a0:	add    %rcx,%rsi
   924a3:	imul   $0x15180,%rsi,%rax
   924aa:	imul   $0xe10,%r9,%rcx
   924b1:	imul   $0x3c,%r8,%rdx
   924b5:	add    %rdi,%rcx
   924b8:	add    %rdx,%rcx
   924bb:	add    %rax,%rcx
   924be:	imul   $0x3e8,%rcx,%r8
   924c5:	add    $0xfffffffffad9a400,%r8
   924cc:	jmp    92bf0 <sessions::fast::parse_events_avx2+0x1770>
   924d1:	add    0x10(%rsp),%rdi
   924d6:	mov    %r9,%rbx
   924d9:	mov    %r10d,0x8(%rsp)
   924de:	mov    %r8d,%ebp
   924e1:	vzeroupper
   924e4:	call   a11d0 <sessions::fast::keys::intern_exotic>
   924e9:	mov    %ebp,%r8d
   924ec:	mov    0x8(%rsp),%r10d
   924f1:	mov    %rbx,%r9
   924f4:	vmovdqa -0x8a5ac(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   924fc:	vmovdqa -0x89c84(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   92504:	vmovdqa -0x8a4cc(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   9250c:	vmovdqa -0x8a214(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   92514:	vmovdqa -0x89a3c(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   9251c:	vmovdqa -0x89d64(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   92524:	vmovdqa -0x8990c(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   9252c:	vmovdqa -0x895c4(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   92534:	mov    %rax,%rbp
   92537:	jmp    91d91 <sessions::fast::parse_events_avx2+0x911>
   9253c:	mov    $0xffffffff,%ebp
   92541:	jmp    925bd <sessions::fast::parse_events_avx2+0x113d>
   92543:	mov    %ecx,%edx
   92545:	add    $0xfffffffffffffff8,%rcx
   92549:	lea    0x0(,%rcx,8),%esi
   92550:	xor    %eax,%eax
   92552:	cmp    $0x10,%edx
   92555:	movabs $0x3030303030303030,%r10
   9255f:	shrx   %rsi,%r10,%rdx
   92564:	cmovae %rax,%rdx
   92568:	mov    %ecx,%esi
   9256a:	neg    %sil
   9256d:	shl    $0x3,%sil
   92571:	shlx   %rsi,(%rbx),%rsi
   92576:	or     %rsi,%rdx
   92579:	xor    %r10,%rdx
   9257c:	movabs $0x7676767676767676,%r9
   92586:	lea    (%rdx,%r9,1),%rdi
   9258a:	or     %rsi,%rdi
   9258d:	mov    $0xffffffff,%ebp
   92592:	movabs $0x8080808080808080,%r8
   9259c:	test   %r8,%rdi
   9259f:	jne    925bd <sessions::fast::parse_events_avx2+0x113d>
   925a1:	mov    (%rbx,%rcx,1),%rax
   925a5:	mov    %rax,%rcx
   925a8:	xor    %r10,%rcx
   925ab:	lea    (%rcx,%r9,1),%rsi
   925af:	or     %rax,%rsi
   925b2:	test   %r8,%rsi
   925b5:	je     92a62 <sessions::fast::parse_events_avx2+0x15e2>
   925bb:	xor    %eax,%eax
   925bd:	movabs $0x7fffffffffffffff,%r10
   925c7:	xor    %r9d,%r9d
   925ca:	incq   0xe0(%rsp)
   925d2:	mov    0x128(%rsp),%r8
   925da:	mov    %r8,%rcx
   925dd:	movabs $0x9e3779b97f4a7c15,%rdx
   925e7:	imul   %rdx,%rcx
   925eb:	mov    0x20(%rsp),%rdx
   925f0:	movzbl 0x920(%rdx),%edx
   925f7:	xor    %esi,%esi
   925f9:	sub    %dl,%sil
   925fc:	shrx   %rsi,%rcx,%rbx
   92601:	mov    0xd8(%rsp),%rdi
   92609:	mov    0x68(%rdi),%rcx
   9260d:	movzbl (%rcx,%rbx,1),%esi
   92611:	mov    %rbx,%r13
   92614:	shl    $0x6,%r13
   92618:	add    0x50(%rdi),%r13
   9261c:	lea    0x1(%rsi),%rdx
   92620:	shl    $0x5,%esi
   92623:	mov    %r8,(%rsi,%r13,1)
   92627:	mov    %rax,0x8(%rsi,%r13,1)
   9262c:	mov    %r10,0x10(%rsi,%r13,1)
   92631:	mov    %ebp,0x18(%rsi,%r13,1)
   92636:	mov    %r9d,0x1c(%rsi,%r13,1)
   9263b:	cmp    $0x2,%rdx
   9263f:	jne    926a6 <sessions::fast::parse_events_avx2+0x1226>
   92641:	movb   $0x0,(%rcx,%rbx,1)
   92645:	mov    0x8(%rdi),%rax
   92649:	mov    0x20(%rdi),%rdx
   9264d:	mov    (%rax,%rbx,8),%rcx
   92651:	cmp    (%rdx,%rbx,8),%rcx
   92655:	mov    0x48(%rsp),%r9
   9265a:	je     9301d <sessions::fast::parse_events_avx2+0x1b9d>
   92660:	vmovaps 0x0(%r13),%xmm0
   92666:	movntdq %xmm0,(%rcx)
   9266a:	lea    0x10(%rcx),%rdx
   9266e:	vmovaps 0x10(%r13),%xmm0
   92674:	movntdq %xmm0,(%rdx)
   92678:	lea    0x20(%rcx),%rdx
   9267c:	vmovaps 0x20(%r13),%xmm0
   92682:	movntdq %xmm0,(%rdx)
   92686:	add    $0x30,%rcx
   9268a:	vmovdqa 0x30(%r13),%xmm0
   92690:	movntdq %xmm0,(%rcx)
   92694:	addq   $0x40,(%rax,%rbx,8)
   92699:	mov    0xa0(%rsp),%r14
   926a1:	jmp    91999 <sessions::fast::parse_events_avx2+0x519>
   926a6:	mov    %dl,(%rcx,%rbx,1)
   926a9:	mov    0xa0(%rsp),%r14
   926b1:	mov    0x78(%rsp),%rsi
   926b6:	mov    0x54(%rsp),%r8d
   926bb:	mov    0x2c(%rsp),%r13d
   926c0:	mov    0x48(%rsp),%r9
   926c5:	jmp    919a8 <sessions::fast::parse_events_avx2+0x528>
   926ca:	movzbl 0x13(%rbx),%r13d
   926cf:	cmp    $0x2b,%r13d
   926d3:	je     926df <sessions::fast::parse_events_avx2+0x125f>
   926d5:	cmp    $0x2d,%r13d
   926d9:	jne    929cc <sessions::fast::parse_events_avx2+0x154c>
   926df:	mov    %r8,0x80(%rsp)
   926e7:	mov    %rdi,0x58(%rsp)
   926ec:	mov    %r10d,0x8(%rsp)
   926f1:	mov    %r9,0x30(%rsp)
   926f6:	mov    (%rbx),%rdx
   926f9:	mov    0x20(%rsp),%rcx
   926fe:	mov    0x8e0(%rcx),%rax
   92705:	imul   %rdx,%rax
   92709:	shr    $0x3c,%rax
   9270d:	cmp    %rdx,0x698(%rcx,%rax,8)
   92715:	jne    9324b <sessions::fast::parse_events_avx2+0x1dcb>
   9271b:	mov    0x718(%rcx,%rax,8),%r11
   92723:	mov    0x798(%rcx,%rax,8),%rsi
   9272b:	movzwl 0x8(%rbx),%r9d
   92730:	xor    $0x3030,%r9
   92737:	mov    0xb(%rbx),%rcx
   9273b:	mov    %rcx,%rax
   9273e:	movabs $0x3030303030303030,%rdx
   92748:	xor    %rdx,%rax
   9274b:	lea    0x7676(%r9),%edx
   92752:	or     %r9d,%edx
   92755:	and    $0x8080,%edx
   9275b:	movabs $0x7676767676767676,%rdi
   92765:	add    %rax,%rdi
   92768:	or     %rcx,%rdi
   9276b:	movabs $0x8080008080008080,%r8
   92775:	and    %r8,%rdi
   92778:	xor    %r8d,%r8d
   9277b:	cmpb   $0x54,0xa(%rbx)
   9277f:	setne  %r8b
   92783:	movabs $0xff0000ff0000,%r10
   9278d:	and    %r10,%rcx
   92790:	or     %r8,%rcx
   92793:	or     %rdi,%rcx
   92796:	or     %rdx,%rcx
   92799:	movabs $0x3a00003a0000,%rdx
   927a3:	cmp    %rdx,%rcx
   927a6:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   927ac:	lea    (%rax,%rax,4),%rcx
   927b0:	shr    $0x8,%rax
   927b4:	lea    (%rax,%rcx,2),%rcx
   927b8:	mov    %rcx,%rax
   927bb:	shr    $0x30,%rax
   927bf:	movzbl %al,%edx
   927c2:	xor    %eax,%eax
   927c4:	cmp    $0x3b,%rdx
   927c8:	ja     93012 <sessions::fast::parse_events_avx2+0x1b92>
   927ce:	mov    %ecx,%edi
   927d0:	shr    $0x18,%edi
   927d3:	cmp    $0x3b,%edi
   927d6:	ja     93012 <sessions::fast::parse_events_avx2+0x1b92>
   927dc:	movzbl %cl,%r8d
   927e0:	cmp    $0x17,%r8d
   927e4:	ja     93012 <sessions::fast::parse_events_avx2+0x1b92>
   927ea:	movzbl %r9b,%ecx
   927ee:	lea    (%rcx,%rcx,4),%rcx
   927f2:	shr    $0x8,%r9d
   927f6:	lea    (%r9,%rcx,2),%r9
   927fa:	test   %r9,%r9
   927fd:	je     93012 <sessions::fast::parse_events_avx2+0x1b92>
   92803:	cmp    %rsi,%r9
   92806:	jg     93012 <sessions::fast::parse_events_avx2+0x1b92>
   9280c:	cmpb   $0x3a,0x16(%rbx)
   92810:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92816:	movzbl 0x14(%rbx),%esi
   9281a:	add    $0xd0,%sil
   9281e:	xor    %eax,%eax
   92820:	cmp    $0x9,%sil
   92824:	ja     93012 <sessions::fast::parse_events_avx2+0x1b92>
   9282a:	mov    %r11,0x138(%rsp)
   92832:	movzbl 0x15(%rbx),%r11d
   92837:	add    $0xd0,%r11b
   9283b:	cmp    $0x9,%r11b
   9283f:	ja     93012 <sessions::fast::parse_events_avx2+0x1b92>
   92845:	movzbl 0x17(%rbx),%ecx
   92849:	add    $0xd0,%cl
   9284c:	cmp    $0x9,%cl
   9284f:	ja     93012 <sessions::fast::parse_events_avx2+0x1b92>
   92855:	movzbl 0x18(%rbx),%r10d
   9285a:	add    $0xd0,%r10b
   9285e:	cmp    $0x9,%r10b
   92862:	ja     93012 <sessions::fast::parse_events_avx2+0x1b92>
   92868:	movzbl %sil,%eax
   9286c:	add    %eax,%eax
   9286e:	lea    (%rax,%rax,4),%esi
   92871:	add    %r11b,%sil
   92874:	xor    %eax,%eax
   92876:	cmp    $0x17,%sil
   9287a:	ja     93012 <sessions::fast::parse_events_avx2+0x1b92>
   92880:	movzbl %cl,%ecx
   92883:	add    %ecx,%ecx
   92885:	lea    (%rcx,%rcx,4),%ecx
   92888:	add    %r10b,%cl
   9288b:	cmp    $0x3b,%cl
   9288e:	ja     93012 <sessions::fast::parse_events_avx2+0x1b92>
   92894:	add    0x138(%rsp),%r9
   9289c:	imul   $0x15180,%r9,%rax
   928a3:	imul   $0xe10,%r8,%r8
   928aa:	imul   $0x3c,%rdi,%rdi
   928ae:	add    %rdx,%r8
   928b1:	add    %rdi,%r8
   928b4:	add    %rax,%r8
   928b7:	imul   $0x3e8,%r8,%rax
   928be:	add    $0xfffffffffad9a400,%rax
   928c4:	movzbl %cl,%ecx
   928c7:	movzbl %sil,%edx
   928cb:	imul   $0x36ee80,%rdx,%rdx
   928d2:	imul   $0xea60,%rcx,%rcx
   928d9:	add    %rdx,%rcx
   928dc:	mov    %rcx,%r8
   928df:	neg    %r8
   928e2:	cmp    $0x2b,%r13b
   928e6:	cmovne %rcx,%r8
   928ea:	add    %rax,%r8
   928ed:	jmp    92bf0 <sessions::fast::parse_events_avx2+0x1770>
   928f2:	lea    -0x1(%rcx),%edx
   928f5:	cmp    $0x10,%edx
   928f8:	jae    929c4 <sessions::fast::parse_events_avx2+0x1544>
   928fe:	cmp    $0x9,%ecx
   92901:	jae    92aea <sessions::fast::parse_events_avx2+0x166a>
   92907:	lea    0x0(,%rcx,8),%edx
   9290e:	xor    %eax,%eax
   92910:	cmp    $0x8,%rcx
   92914:	movabs $0x3030303030303030,%rsi
   9291e:	shrx   %rdx,%rsi,%rdx
   92923:	cmove  %rax,%rdx
   92927:	neg    %cl
   92929:	shl    $0x3,%cl
   9292c:	shlx   %rcx,(%rbx),%rcx
   92931:	or     %rcx,%rdx
   92934:	xor    %rsi,%rdx
   92937:	movabs $0x7676767676767676,%rsi
   92941:	add    %rdx,%rsi
   92944:	or     %rcx,%rsi
   92947:	movabs $0x8080808080808080,%rcx
   92951:	test   %rcx,%rsi
   92954:	jne    93012 <sessions::fast::parse_events_avx2+0x1b92>
   9295a:	mov    %r8,0x80(%rsp)
   92962:	mov    %rdi,0x58(%rsp)
   92967:	lea    (%rdx,%rdx,4),%rax
   9296b:	shr    $0x8,%rdx
   9296f:	lea    (%rdx,%rax,2),%r8
   92973:	mov    %r8,%rax
   92976:	movabs $0xff000000ff,%rdx
   92980:	and    %rdx,%rax
   92983:	movabs $0xf424000000064,%rcx
   9298d:	imul   %rcx,%rax
   92991:	shr    $0x10,%r8
   92995:	and    %rdx,%r8
   92998:	movabs $0x271000000001,%rcx
   929a2:	imul   %rcx,%r8
   929a6:	add    %rax,%r8
   929a9:	shr    $0x20,%r8
   929ad:	mov    0x20(%rsp),%rdx
   929b2:	cmp    %r8,0x8e8(%rdx)
   929b9:	jg     93010 <sessions::fast::parse_events_avx2+0x1b90>
   929bf:	jmp    92c0c <sessions::fast::parse_events_avx2+0x178c>
   929c4:	cmp    %esi,%eax
   929c6:	je     93010 <sessions::fast::parse_events_avx2+0x1b90>
   929cc:	mov    %r8,0x80(%rsp)
   929d4:	mov    %rdi,0x58(%rsp)
   929d9:	xor    %edx,%edx
   929db:	xor    %eax,%eax
   929dd:	xor    %esi,%esi
   929df:	xor    %r8d,%r8d
   929e2:	data16 data16 data16 data16 cs nopw 0x0(%rax,%rax,1)
   929f0:	movzbl (%rbx,%rdx,1),%edi
   929f4:	add    $0xd0,%dil
   929f8:	cmp    $0x9,%dil
   929fc:	ja     93006 <sessions::fast::parse_events_avx2+0x1b86>
   92a02:	test   %dil,%dil
   92a05:	mov    %rbx,%r11
   92a08:	mov    %r8,%rbx
   92a0b:	setne  %r8b
   92a0f:	or     %r8b,%sil
   92a12:	movzbl %sil,%r8d
   92a16:	and    $0x1,%r8d
   92a1a:	add    %r8d,%eax
   92a1d:	lea    (%rbx,%rbx,4),%r8
   92a21:	mov    %r11,%rbx
   92a24:	movzbl %dil,%edi
   92a28:	lea    (%rdi,%r8,2),%r8
   92a2c:	inc    %rdx
   92a2f:	cmp    %rdx,%rcx
   92a32:	jne    929f0 <sessions::fast::parse_events_avx2+0x1570>
   92a34:	cmp    $0x14,%eax
   92a37:	setb   %al
   92a3a:	test   %r8,%r8
   92a3d:	setns  %cl
   92a40:	and    %al,%cl
   92a42:	cmp    $0x1,%cl
   92a45:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92a4b:	mov    0x20(%rsp),%rdx
   92a50:	cmp    %r8,0x8e8(%rdx)
   92a57:	jle    92c0c <sessions::fast::parse_events_avx2+0x178c>
   92a5d:	jmp    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92a62:	lea    (%rdx,%rdx,4),%rax
   92a66:	shr    $0x8,%rdx
   92a6a:	lea    (%rdx,%rax,2),%rax
   92a6e:	mov    %rax,%rdx
   92a71:	movabs $0xff000000ff,%r8
   92a7b:	and    %r8,%rdx
   92a7e:	movabs $0xf424000000064,%rsi
   92a88:	imul   %rsi,%rdx
   92a8c:	shr    $0x10,%rax
   92a90:	and    %r8,%rax
   92a93:	movabs $0x271000000001,%rdi
   92a9d:	imul   %rdi,%rax
   92aa1:	add    %rdx,%rax
   92aa4:	shr    $0x20,%rax
   92aa8:	lea    (%rcx,%rcx,4),%rdx
   92aac:	shr    $0x8,%rcx
   92ab0:	lea    (%rcx,%rdx,2),%rcx
   92ab4:	mov    %rcx,%rdx
   92ab7:	and    %r8,%rdx
   92aba:	imul   %rsi,%rdx
   92abe:	shr    $0x10,%rcx
   92ac2:	and    %r8,%rcx
   92ac5:	imul   %rdi,%rcx
   92ac9:	add    %rdx,%rcx
   92acc:	shr    $0x20,%rcx
   92ad0:	imul   $0x5f5e100,%rax,%rax
   92ad7:	add    %rcx,%rax
   92ada:	mov    %r14,%r9
   92add:	mov    %rax,%r14
   92ae0:	mov    0x8(%rsp),%r10d
   92ae5:	jmp    92317 <sessions::fast::parse_events_avx2+0xe97>
   92aea:	mov    %r8,0x80(%rsp)
   92af2:	mov    %rdi,0x58(%rsp)
   92af7:	mov    %r10d,0x8(%rsp)
   92afc:	mov    %r9,0x30(%rsp)
   92b01:	mov    %ecx,%edx
   92b03:	add    $0xfffffffffffffff8,%rcx
   92b07:	lea    0x0(,%rcx,8),%esi
   92b0e:	xor    %eax,%eax
   92b10:	cmp    $0x10,%edx
   92b13:	movabs $0x3030303030303030,%r10
   92b1d:	shrx   %rsi,%r10,%rdx
   92b22:	cmovae %rax,%rdx
   92b26:	mov    %ecx,%esi
   92b28:	neg    %sil
   92b2b:	shl    $0x3,%sil
   92b2f:	shlx   %rsi,(%rbx),%rsi
   92b34:	or     %rsi,%rdx
   92b37:	xor    %r10,%rdx
   92b3a:	movabs $0x7676767676767676,%r9
   92b44:	lea    (%rdx,%r9,1),%rdi
   92b48:	or     %rsi,%rdi
   92b4b:	movabs $0x8080808080808080,%r8
   92b55:	test   %r8,%rdi
   92b58:	jne    93012 <sessions::fast::parse_events_avx2+0x1b92>
   92b5e:	mov    (%rbx,%rcx,1),%rax
   92b62:	mov    %rax,%rcx
   92b65:	xor    %r10,%rcx
   92b68:	lea    (%rcx,%r9,1),%rsi
   92b6c:	or     %rax,%rsi
   92b6f:	test   %r8,%rsi
   92b72:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92b78:	lea    (%rdx,%rdx,4),%rax
   92b7c:	shr    $0x8,%rdx
   92b80:	lea    (%rdx,%rax,2),%rax
   92b84:	mov    %rax,%rdx
   92b87:	movabs $0xff000000ff,%r8
   92b91:	and    %r8,%rdx
   92b94:	movabs $0xf424000000064,%rsi
   92b9e:	imul   %rsi,%rdx
   92ba2:	shr    $0x10,%rax
   92ba6:	and    %r8,%rax
   92ba9:	movabs $0x271000000001,%rdi
   92bb3:	imul   %rdi,%rax
   92bb7:	add    %rdx,%rax
   92bba:	shr    $0x20,%rax
   92bbe:	lea    (%rcx,%rcx,4),%rdx
   92bc2:	shr    $0x8,%rcx
   92bc6:	lea    (%rcx,%rdx,2),%rcx
   92bca:	mov    %rcx,%rdx
   92bcd:	and    %r8,%rdx
   92bd0:	imul   %rsi,%rdx
   92bd4:	shr    $0x10,%rcx
   92bd8:	and    %r8,%rcx
   92bdb:	imul   %rdi,%rcx
   92bdf:	add    %rdx,%rcx
   92be2:	shr    $0x20,%rcx
   92be6:	imul   $0x5f5e100,%rax,%r8
   92bed:	add    %rcx,%r8
   92bf0:	mov    0x30(%rsp),%r9
   92bf5:	mov    0x8(%rsp),%r10d
   92bfa:	mov    0x20(%rsp),%rdx
   92bff:	cmp    %r8,0x8e8(%rdx)
   92c06:	jg     93010 <sessions::fast::parse_events_avx2+0x1b90>
   92c0c:	xor    %eax,%eax
   92c0e:	cmp    %r8,%r14
   92c11:	setns  %al
   92c14:	movabs $0x7fffffffffffffff,%rcx
   92c1e:	add    %rcx,%rax
   92c21:	mov    %r14,%rcx
   92c24:	sub    %r8,%rcx
   92c27:	cmovo  %rax,%rcx
   92c2b:	xor    %eax,%eax
   92c2d:	cmp    0x8f0(%rdx),%r8
   92c34:	jge    93012 <sessions::fast::parse_events_avx2+0x1b92>
   92c3a:	cmp    $0x5265c00,%rcx
   92c41:	jg     93012 <sessions::fast::parse_events_avx2+0x1b92>
   92c47:	mov    0xa8(%rsp),%rcx
   92c4f:	mov    0x38(%rsp),%eax
   92c53:	sub    %eax,%ecx
   92c55:	mov    %eax,%eax
   92c57:	cmp    $0x8,%ecx
   92c5a:	je     92dc7 <sessions::fast::parse_events_avx2+0x1947>
   92c60:	cmp    $0x4,%ecx
   92c63:	mov    0x1c(%rsp),%edx
   92c67:	mov    0x58(%rsp),%rsi
   92c6c:	mov    0x80(%rsp),%rdi
   92c74:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92c7a:	mov    0x10(%rsp),%rcx
   92c7f:	movzbl (%rcx,%rax,1),%ecx
   92c83:	cmp    $0x63,%ecx
   92c86:	je     92fe5 <sessions::fast::parse_events_avx2+0x1b65>
   92c8c:	cmp    $0x76,%ecx
   92c8f:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92c95:	mov    0x10(%rsp),%rcx
   92c9a:	cmpb   $0x69,0x1(%rcx,%rax,1)
   92c9f:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92ca5:	cmpb   $0x65,0x2(%rcx,%rax,1)
   92caa:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92cb0:	xor    %r9d,%r9d
   92cb3:	cmpb   $0x77,0x3(%rcx,%rax,1)
   92cb8:	jne    93006 <sessions::fast::parse_events_avx2+0x1b86>
   92cbe:	mov    %r9,%rbx
   92cc1:	sub    %edx,%esi
   92cc3:	cmp    $0xa,%esi
   92cc6:	ja     934f3 <sessions::fast::parse_events_avx2+0x2073>
   92ccc:	mov    0x10(%rsp),%rax
   92cd1:	vmovdqu (%rax,%rdi,1),%xmm1
   92cd6:	vmovd  %esi,%xmm0
   92cda:	vpbroadcastb %xmm0,%xmm0
   92cdf:	vpcmpgtb %xmm8,%xmm0,%xmm0
   92ce4:	vpaddb %xmm1,%xmm9,%xmm2
   92ce8:	vpminub %xmm2,%xmm10,%xmm3
   92cec:	vpcmpeqb %xmm3,%xmm2,%xmm2
   92cf0:	vpaddb %xmm1,%xmm11,%xmm3
   92cf4:	vpminub %xmm3,%xmm12,%xmm4
   92cf8:	vpcmpeqb %xmm4,%xmm3,%xmm3
   92cfc:	vpaddb %xmm1,%xmm13,%xmm4
   92d00:	vpminub %xmm4,%xmm12,%xmm5
   92d04:	vpcmpeqb %xmm5,%xmm4,%xmm5
   92d08:	vpcmpeqb %xmm1,%xmm14,%xmm4
   92d0c:	vpor   %xmm2,%xmm3,%xmm6
   92d10:	vpor   %xmm5,%xmm4,%xmm7
   92d14:	vpor   %xmm6,%xmm7,%xmm6
   92d18:	vpandn %xmm0,%xmm6,%xmm6
   92d1c:	vpmovmskb %xmm6,%eax
   92d20:	test   %eax,%eax
   92d22:	jne    934f3 <sessions::fast::parse_events_avx2+0x2073>
   92d28:	vpaddb %xmm1,%xmm15,%xmm6
   92d2c:	vpand  %xmm6,%xmm5,%xmm5
   92d30:	vpaddb -0x89e78(%rip),%xmm1,%xmm6        # 8ec0 <__abi_tag+0x8bc4>
   92d38:	vpand  %xmm6,%xmm3,%xmm3
   92d3c:	vpaddb -0x8a8b4(%rip),%xmm1,%xmm1        # 8490 <__abi_tag+0x8194>
   92d44:	vpand  %xmm1,%xmm2,%xmm1
   92d48:	vpor   %xmm3,%xmm1,%xmm1
   92d4c:	vpand  -0x8a4c4(%rip),%xmm4,%xmm2        # 8890 <__abi_tag+0x8594>
   92d54:	vpor   %xmm2,%xmm5,%xmm2
   92d58:	vpor   %xmm1,%xmm2,%xmm1
   92d5c:	vpand  %xmm1,%xmm0,%xmm0
   92d60:	vpmaddubsw -0x8ae09(%rip),%xmm0,%xmm0        # 7f60 <__abi_tag+0x7c64>
   92d69:	vpmaddwd -0x8a4d1(%rip),%xmm0,%xmm0        # 88a0 <__abi_tag+0x85a4>
   92d71:	vpextrd $0x1,%xmm0,%ecx
   92d77:	vmovd  %xmm0,%edx
   92d7b:	vpextrd $0x2,%xmm0,%eax
   92d81:	shl    $0x24,%rdx
   92d85:	shl    $0xc,%rcx
   92d89:	or     %rdx,%rcx
   92d8c:	shr    $0xc,%eax
   92d8f:	or     %rcx,%rax
   92d92:	mov    0x20(%rsp),%rcx
   92d97:	sub    0x8f8(%rcx),%r8d
   92d9e:	mov    %r8d,%ebp
   92da1:	vpbroadcastb -0x896a4(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   92daa:	vpbroadcastb -0x896ac(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   92db3:	vpbroadcastb -0x896b4(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   92dbc:	mov    %r14,%r10
   92dbf:	mov    %rbx,%r9
   92dc2:	jmp    925ca <sessions::fast::parse_events_avx2+0x114a>
   92dc7:	mov    0x10(%rsp),%rcx
   92dcc:	cmpb   $0x70,(%rcx,%rax,1)
   92dd0:	mov    0x58(%rsp),%rdx
   92dd5:	mov    0x80(%rsp),%rsi
   92ddd:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92de3:	cmpb   $0x75,0x1(%rcx,%rax,1)
   92de8:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92dee:	cmpb   $0x72,0x2(%rcx,%rax,1)
   92df3:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92df9:	cmpb   $0x63,0x3(%rcx,%rax,1)
   92dfe:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92e04:	cmpb   $0x68,0x4(%rcx,%rax,1)
   92e09:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92e0f:	cmpb   $0x61,0x5(%rcx,%rax,1)
   92e14:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92e1a:	cmpb   $0x73,0x6(%rcx,%rax,1)
   92e1f:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92e25:	mov    %r14,%rbx
   92e28:	cmpb   $0x65,0x7(%rcx,%rax,1)
   92e2d:	jne    933d6 <sessions::fast::parse_events_avx2+0x1f56>
   92e33:	mov    %r8,0x38(%rsp)
   92e38:	mov    %rsi,0x80(%rsp)
   92e40:	mov    %rdx,0x58(%rsp)
   92e45:	mov    %r9,%r14
   92e48:	mov    %r10d,%edi
   92e4b:	add    %rcx,%rdi
   92e4e:	mov    0x118(%rsp),%rsi
   92e56:	sub    %r10d,%esi
   92e59:	vzeroupper
   92e5c:	call   9ce00 <sessions::events::parse_price>
   92e61:	test   $0x1,%al
   92e63:	je     933e3 <sessions::fast::parse_events_avx2+0x1f63>
   92e69:	test   %edx,%edx
   92e6b:	vmovdqa -0x89f03(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   92e73:	vmovdqa -0x8a25b(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   92e7b:	vmovdqa -0x8a6c3(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   92e83:	vmovdqa -0x8a3ab(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   92e8b:	vmovdqa -0x8ab93(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   92e93:	vmovdqa -0x8ae5b(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   92e9b:	vmovdqa -0x8a623(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   92ea3:	je     9344b <sessions::fast::parse_events_avx2+0x1fcb>
   92ea9:	mov    %edx,%r15d
   92eac:	mov    %r14,%rsi
   92eaf:	sub    0x50(%rsp),%esi
   92eb3:	cmp    $0xa,%esi
   92eb6:	mov    0x10(%rsp),%rcx
   92ebb:	ja     9354b <sessions::fast::parse_events_avx2+0x20cb>
   92ec1:	mov    0x60(%rsp),%rax
   92ec6:	vmovdqu (%rcx,%rax,1),%xmm1
   92ecb:	vmovd  %esi,%xmm0
   92ecf:	vpbroadcastb %xmm0,%xmm0
   92ed4:	vpcmpgtb %xmm8,%xmm0,%xmm0
   92ed9:	vpaddb %xmm1,%xmm9,%xmm2
   92edd:	vpminub %xmm2,%xmm10,%xmm3
   92ee1:	vpcmpeqb %xmm3,%xmm2,%xmm2
   92ee5:	vpaddb %xmm1,%xmm11,%xmm3
   92ee9:	vpminub %xmm3,%xmm12,%xmm4
   92eed:	vpcmpeqb %xmm4,%xmm3,%xmm3
   92ef1:	vpaddb %xmm1,%xmm13,%xmm4
   92ef5:	vpminub %xmm4,%xmm12,%xmm5
   92ef9:	vpcmpeqb %xmm5,%xmm4,%xmm5
   92efd:	vpcmpeqb %xmm1,%xmm14,%xmm4
   92f01:	vpor   %xmm2,%xmm3,%xmm6
   92f05:	vpor   %xmm5,%xmm4,%xmm7
   92f09:	vpor   %xmm6,%xmm7,%xmm6
   92f0d:	vpandn %xmm0,%xmm6,%xmm6
   92f11:	vpmovmskb %xmm6,%eax
   92f15:	test   %eax,%eax
   92f17:	jne    9354b <sessions::fast::parse_events_avx2+0x20cb>
   92f1d:	vpaddb -0x8afd5(%rip),%xmm1,%xmm6        # 7f50 <__abi_tag+0x7c54>
   92f25:	vpand  %xmm6,%xmm5,%xmm5
   92f29:	vpaddb -0x8a071(%rip),%xmm1,%xmm6        # 8ec0 <__abi_tag+0x8bc4>
   92f31:	vpand  %xmm6,%xmm3,%xmm3
   92f35:	vpaddb -0x8aaad(%rip),%xmm1,%xmm1        # 8490 <__abi_tag+0x8194>
   92f3d:	vpand  %xmm1,%xmm2,%xmm1
   92f41:	vpor   %xmm3,%xmm1,%xmm1
   92f45:	vpand  -0x8a6bd(%rip),%xmm4,%xmm2        # 8890 <__abi_tag+0x8594>
   92f4d:	vpor   %xmm2,%xmm5,%xmm2
   92f51:	vpor   %xmm1,%xmm2,%xmm1
   92f55:	vpand  %xmm1,%xmm0,%xmm0
   92f59:	vpmaddubsw -0x8b002(%rip),%xmm0,%xmm0        # 7f60 <__abi_tag+0x7c64>
   92f62:	vpmaddwd -0x8a6ca(%rip),%xmm0,%xmm0        # 88a0 <__abi_tag+0x85a4>
   92f6a:	vpextrd $0x1,%xmm0,%eax
   92f70:	vmovd  %xmm0,%ecx
   92f74:	vpextrd $0x2,%xmm0,%edx
   92f7a:	shl    $0x24,%rcx
   92f7e:	shl    $0xc,%rax
   92f82:	or     %rcx,%rax
   92f85:	shr    $0xc,%edx
   92f88:	or     %rax,%rdx
   92f8b:	mov    %rdx,%rcx
   92f8e:	movabs $0x9e3779b97f4a7c15,%rax
   92f98:	imul   %rax,%rcx
   92f9c:	shr    $0x20,%rcx
   92fa0:	mov    0x20(%rsp),%r8
   92fa5:	mov    0x10(%r8),%rsi
   92fa9:	mov    0x30(%r8),%rax
   92fad:	mov    %eax,%edi
   92faf:	and    %ecx,%edi
   92fb1:	cmp    %rsi,%rdi
   92fb4:	jae    957fc <sessions::fast::parse_events_avx2+0x437c>
   92fba:	mov    0x8(%r8),%rcx
   92fbe:	mov    (%rcx,%rdi,8),%r8
   92fc2:	cmp    %rdx,%r8
   92fc5:	je     93450 <sessions::fast::parse_events_avx2+0x1fd0>
   92fcb:	cmp    $0xffffffffffffffff,%r8
   92fcf:	je     9346f <sessions::fast::parse_events_avx2+0x1fef>
   92fd5:	inc    %rdi
   92fd8:	and    %rax,%rdi
   92fdb:	cmp    %rsi,%rdi
   92fde:	jb     92fbe <sessions::fast::parse_events_avx2+0x1b3e>
   92fe0:	jmp    957fc <sessions::fast::parse_events_avx2+0x437c>
   92fe5:	mov    0x10(%rsp),%rcx
   92fea:	cmpb   $0x61,0x1(%rcx,%rax,1)
   92fef:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92ff1:	cmpb   $0x72,0x2(%rcx,%rax,1)
   92ff6:	jne    93010 <sessions::fast::parse_events_avx2+0x1b90>
   92ff8:	xor    %r9d,%r9d
   92ffb:	cmpb   $0x74,0x3(%rcx,%rax,1)
   93000:	je     92cbe <sessions::fast::parse_events_avx2+0x183e>
   93006:	xor    %eax,%eax
   93008:	mov    %r14,%r10
   9300b:	jmp    925c7 <sessions::fast::parse_events_avx2+0x1147>
   93010:	xor    %eax,%eax
   93012:	xor    %r9d,%r9d
   93015:	mov    %r14,%r10
   93018:	jmp    925ca <sessions::fast::parse_events_avx2+0x114a>
   9301d:	mov    0xe8(%rsp),%rsi
   93025:	mov    %rbx,%rdx
   93028:	vzeroupper
   9302b:	call   786f0 <<sessions::fast::sink::Sink<sessions::fast::EventRec>>::refill>
   93030:	mov    0xd8(%rsp),%rdi
   93038:	vpbroadcastb -0x89939(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   93041:	vpbroadcastb -0x89943(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   9304a:	vpbroadcastb -0x8994d(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   93053:	vmovdqa -0x8b10b(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   9305b:	vmovdqa -0x8a7e3(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   93063:	vmovdqa -0x8b02b(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   9306b:	vmovdqa -0x8ad73(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   93073:	vmovdqa -0x8a59b(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   9307b:	vmovdqa -0x8a8c3(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   93083:	vmovdqa -0x8a46b(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   9308b:	vmovdqa -0x8a123(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   93093:	mov    0x48(%rsp),%r9
   93098:	mov    0x8(%rdi),%rax
   9309c:	mov    (%rax,%rbx,8),%rcx
   930a0:	jmp    92660 <sessions::fast::parse_events_avx2+0x11e0>
   930a5:	lea    0x98(%rcx),%rsi
   930ac:	lea    0x88(%rsp),%rdi
   930b4:	vzeroupper
   930b7:	call   726d0 <<sessions::fast::ts::Calendar>::month_slow>
   930bc:	cmpb   $0x0,0x88(%rsp)
   930c4:	je     931d7 <sessions::fast::parse_events_avx2+0x1d57>
   930ca:	mov    0x90(%rsp),%r11
   930d2:	mov    0x98(%rsp),%rdi
   930da:	vmovdqa -0x8a172(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   930e2:	vmovdqa -0x8a4ca(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   930ea:	vmovdqa -0x8a932(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   930f2:	vmovdqa -0x8a61a(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   930fa:	vmovdqa -0x8ae02(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   93102:	vmovdqa -0x8b0ca(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   9310a:	vmovdqa -0x8a892(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   93112:	vmovdqa -0x8b1ca(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   9311a:	vpbroadcastb -0x89a1d(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   93123:	vpbroadcastb -0x89a25(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   9312c:	vpbroadcastb -0x89a2d(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   93135:	vmovdqa 0x60(%rsp),%xmm0
   9313b:	jmp    91fd5 <sessions::fast::parse_events_avx2+0xb55>
   93140:	add    $0x98,%rsi
   93147:	lea    0x88(%rsp),%rdi
   9314f:	vzeroupper
   93152:	call   726d0 <<sessions::fast::ts::Calendar>::month_slow>
   93157:	cmpb   $0x0,0x88(%rsp)
   9315f:	je     931d7 <sessions::fast::parse_events_avx2+0x1d57>
   93161:	mov    0x90(%rsp),%rcx
   93169:	mov    0x98(%rsp),%rdx
   93171:	vmovdqa -0x8a209(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   93179:	vmovdqa -0x8a561(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   93181:	vmovdqa -0x8a9c9(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   93189:	vmovdqa -0x8a6b1(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   93191:	vmovdqa -0x8ae99(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   93199:	vmovdqa -0x8b161(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   931a1:	vmovdqa -0x8a929(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   931a9:	vmovdqa -0x8b261(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   931b1:	vpbroadcastb -0x89ab4(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   931ba:	vpbroadcastb -0x89abc(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   931c3:	vpbroadcastb -0x89ac4(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   931cc:	vmovdqa 0x60(%rsp),%xmm0
   931d2:	jmp    91e34 <sessions::fast::parse_events_avx2+0x9b4>
   931d7:	xor    %eax,%eax
   931d9:	mov    $0xffffffff,%ebp
   931de:	movabs $0x7fffffffffffffff,%r10
   931e8:	xor    %r9d,%r9d
   931eb:	vmovdqa -0x8a283(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   931f3:	vmovdqa -0x8a5db(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   931fb:	vmovdqa -0x8aa43(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   93203:	vmovdqa -0x8a72b(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   9320b:	vmovdqa -0x8af13(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   93213:	vmovdqa -0x8b1db(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   9321b:	vmovdqa -0x8a9a3(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   93223:	vmovdqa -0x8b2db(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   9322b:	vpbroadcastb -0x89b2e(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   93234:	vpbroadcastb -0x89b36(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   9323d:	vpbroadcastb -0x89b3e(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   93246:	jmp    925ca <sessions::fast::parse_events_avx2+0x114a>
   9324b:	lea    0x98(%rcx),%rsi
   93252:	lea    0x88(%rsp),%rdi
   9325a:	vzeroupper
   9325d:	call   726d0 <<sessions::fast::ts::Calendar>::month_slow>
   93262:	cmpb   $0x0,0x88(%rsp)
   9326a:	je     93371 <sessions::fast::parse_events_avx2+0x1ef1>
   93270:	mov    0x90(%rsp),%r11
   93278:	mov    0x98(%rsp),%rsi
   93280:	vmovdqa -0x8a318(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   93288:	vmovdqa -0x8a670(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   93290:	vmovdqa -0x8aad8(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   93298:	vmovdqa -0x8a7c0(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   932a0:	vmovdqa -0x8afa8(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   932a8:	vmovdqa -0x8b270(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   932b0:	vmovdqa -0x8aa38(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   932b8:	vmovdqa -0x8b370(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   932c0:	vpbroadcastb -0x89bc3(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   932c9:	vpbroadcastb -0x89bcb(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   932d2:	vpbroadcastb -0x89bd3(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   932db:	jmp    9272b <sessions::fast::parse_events_avx2+0x12ab>
   932e0:	add    $0x98,%rsi
   932e7:	lea    0x88(%rsp),%rdi
   932ef:	vzeroupper
   932f2:	call   726d0 <<sessions::fast::ts::Calendar>::month_slow>
   932f7:	cmpb   $0x0,0x88(%rsp)
   932ff:	je     93371 <sessions::fast::parse_events_avx2+0x1ef1>
   93301:	mov    0x90(%rsp),%rcx
   93309:	mov    0x98(%rsp),%rdx
   93311:	vmovdqa -0x8a3a9(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   93319:	vmovdqa -0x8a701(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   93321:	vmovdqa -0x8ab69(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   93329:	vmovdqa -0x8a851(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   93331:	vmovdqa -0x8b039(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   93339:	vmovdqa -0x8b301(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   93341:	vmovdqa -0x8aac9(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   93349:	vmovdqa -0x8b401(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   93351:	vpbroadcastb -0x89c54(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   9335a:	vpbroadcastb -0x89c5c(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   93363:	vpbroadcastb -0x89c64(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   9336c:	jmp    923bd <sessions::fast::parse_events_avx2+0xf3d>
   93371:	xor    %eax,%eax
   93373:	xor    %r9d,%r9d
   93376:	vmovdqa -0x8a40e(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   9337e:	vmovdqa -0x8a766(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   93386:	vmovdqa -0x8abce(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   9338e:	vmovdqa -0x8a8b6(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   93396:	vmovdqa -0x8b09e(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   9339e:	vmovdqa -0x8b366(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   933a6:	vmovdqa -0x8ab2e(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   933ae:	vmovdqa -0x8b466(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   933b6:	vpbroadcastb -0x89cb9(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   933bf:	vpbroadcastb -0x89cc1(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   933c8:	vpbroadcastb -0x89cc9(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   933d1:	jmp    93015 <sessions::fast::parse_events_avx2+0x1b95>
   933d6:	xor    %eax,%eax
   933d8:	xor    %r9d,%r9d
   933db:	mov    %rbx,%r10
   933de:	jmp    925ca <sessions::fast::parse_events_avx2+0x114a>
   933e3:	xor    %eax,%eax
   933e5:	xor    %r9d,%r9d
   933e8:	vmovdqa -0x8a480(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   933f0:	vmovdqa -0x8a7d8(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   933f8:	vmovdqa -0x8ac40(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   93400:	vmovdqa -0x8a928(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   93408:	vmovdqa -0x8b110(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   93410:	vmovdqa -0x8b3d8(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   93418:	vmovdqa -0x8aba0(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   93420:	vmovdqa -0x8b4d8(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   93428:	vpbroadcastb -0x89d2b(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   93431:	vpbroadcastb -0x89d33(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   9343a:	vpbroadcastb -0x89d3b(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   93443:	mov    %rbx,%r10
   93446:	jmp    925ca <sessions::fast::parse_events_avx2+0x114a>
   9344b:	xor    %r9d,%r9d
   9344e:	jmp    934c4 <sessions::fast::parse_events_avx2+0x2044>
   93450:	mov    0x20(%rsp),%rax
   93455:	mov    0x28(%rax),%rsi
   93459:	cmp    %rsi,%rdi
   9345c:	jae    95808 <sessions::fast::parse_events_avx2+0x4388>
   93462:	mov    0x20(%rsp),%rax
   93467:	mov    0x20(%rax),%rax
   9346b:	mov    (%rax,%rdi,4),%r9d
   9346f:	cmp    %rdx,%r8
   93472:	je     93480 <sessions::fast::parse_events_avx2+0x2000>
   93474:	mov    0x20(%rsp),%rax
   93479:	mov    0x918(%rax),%r9d
   93480:	shl    $0x18,%r9d
   93484:	or     %r15d,%r9d
   93487:	mov    0x40(%rsp),%r15
   9348c:	vmovdqa -0x8a524(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   93494:	vmovdqa -0x8a87c(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   9349c:	vmovdqa -0x8ace4(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   934a4:	vmovdqa -0x8a9cc(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   934ac:	vmovdqa -0x8b1b4(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   934b4:	vmovdqa -0x8b47c(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   934bc:	vmovdqa -0x8ac44(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   934c4:	vmovdqa -0x8b57c(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   934cc:	mov    0x1c(%rsp),%edx
   934d0:	mov    %rbx,%r14
   934d3:	mov    0x58(%rsp),%rsi
   934d8:	mov    0x80(%rsp),%rdi
   934e0:	mov    0x38(%rsp),%r8
   934e5:	mov    %r9,%rbx
   934e8:	sub    %edx,%esi
   934ea:	cmp    $0xa,%esi
   934ed:	jbe    92ccc <sessions::fast::parse_events_avx2+0x184c>
   934f3:	add    0x10(%rsp),%rdi
   934f8:	mov    %r8,%r13
   934fb:	vzeroupper
   934fe:	call   a11d0 <sessions::fast::keys::intern_exotic>
   93503:	mov    %r13,%r8
   93506:	vmovdqa -0x8b5be(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   9350e:	vmovdqa -0x8ac96(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   93516:	vmovdqa -0x8b4de(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   9351e:	vmovdqa -0x8b226(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   93526:	vmovdqa -0x8aa4e(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   9352e:	vmovdqa -0x8ad76(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   93536:	vmovdqa -0x8a91e(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   9353e:	vmovdqa -0x8a5d6(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   93546:	jmp    92d92 <sessions::fast::parse_events_avx2+0x1912>
   9354b:	mov    0x60(%rsp),%rdi
   93550:	add    %rcx,%rdi
   93553:	call   a18a0 <sessions::fast::keys::lookup_exotic>
   93558:	cmp    $0x1,%rax
   9355c:	je     92f8b <sessions::fast::parse_events_avx2+0x1b0b>
   93562:	jmp    93474 <sessions::fast::parse_events_avx2+0x1ff4>
   93567:	nopw   0x0(%rax,%rax,1)
   93570:	mov    %r10d,(%r15,%r12,4)
   93574:	mov    0x48(%rsp),%r9
   93579:	mov    %r11d,(%r9,%r12,4)
   9357d:	mov    0xc0(%rsp),%rax
   93585:	mov    %edx,(%rax,%r12,4)
   93589:	inc    %r12
   9358c:	test   %r12,%r12
   9358f:	jne    91945 <sessions::fast::parse_events_avx2+0x4c5>
   93595:	mov    0x140(%rsp),%r15
   9359d:	mov    %rcx,%rax
   935a0:	mov    %r15,%rcx
   935a3:	sub    %rax,%rcx
   935a6:	inc    %rcx
   935a9:	xor    %ebx,%ebx
   935ab:	mov    0x10(%rsp),%rdi
   935b0:	cmpb   $0xa,(%rdi,%rbx,1)
   935b4:	je     935c3 <sessions::fast::parse_events_avx2+0x2143>
   935b6:	inc    %rbx
   935b9:	cmp    %rbx,%rcx
   935bc:	jne    935b0 <sessions::fast::parse_events_avx2+0x2130>
   935be:	mov    0x78(%rsp),%rbx
   935c3:	mov    %rbx,%rsi
   935c6:	lea    0xf8(%rsp),%rdx
   935ce:	vzeroupper
   935d1:	call   3b4b0 <sessions::fast::scan::long_line::<7, sessions::fast::EventLines<sessions::fast::scan::Avx2>>>
   935d6:	mov    0xb0(%rsp),%rcx
   935de:	add    %rbx,%rcx
   935e1:	inc    %rcx
   935e4:	vmovdqa -0x8a67c(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   935ec:	vmovdqa -0x8a9d4(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   935f4:	vmovdqa -0x8ae3c(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   935fc:	vmovdqa -0x8ab24(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   93604:	vmovdqa -0x8b30c(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   9360c:	vmovdqa -0x8b5d4(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   93614:	vmovdqa -0x8ad9c(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   9361c:	vmovdqa -0x8b6d4(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   93624:	vpbroadcastb -0x89f27(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   9362d:	vpbroadcastb -0x89f2f(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   93636:	vpbroadcastb -0x89f37(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   9363f:	cmp    %rbp,%rcx
   93642:	jb     91617 <sessions::fast::parse_events_avx2+0x197>
   93648:	jmp    9364c <sessions::fast::parse_events_avx2+0x21cc>
   9364a:	xor    %ebp,%ebp
   9364c:	sub    %rbp,%r14
   9364f:	jbe    957d2 <sessions::fast::parse_events_avx2+0x4352>
   93655:	mov    %r14,%rbx
   93658:	add    $0xa0,%rbx
   9365f:	jns    93669 <sessions::fast::parse_events_avx2+0x21e9>
   93661:	vzeroupper
   93664:	call   b24b0 <alloc::raw_vec::capacity_overflow>
   93669:	mov    %rbx,%rdi
   9366c:	vzeroupper
   9366f:	call   *0xeba5b(%rip)        # 17f0d0 <malloc@GLIBC_2.2.5>
   93675:	test   %rax,%rax
   93678:	je     957ef <sessions::fast::parse_events_avx2+0x436f>
   9367e:	mov    %rax,%r15
   93681:	mov    0xf0(%rsp),%rsi
   93689:	add    %rbp,%rsi
   9368c:	mov    %rax,%rdi
   9368f:	mov    %r14,%rdx
   93692:	call   *0xeba28(%rip)        # 17f0c0 <memcpy@GLIBC_2.14>
   93698:	vpxor  %xmm0,%xmm0,%xmm0
   9369c:	vmovdqu %ymm0,(%r15,%r14,1)
   936a2:	vmovdqu %ymm0,0x20(%r15,%r14,1)
   936a9:	vmovdqu %ymm0,0x40(%r15,%r14,1)
   936b0:	vmovdqu %ymm0,0x60(%r15,%r14,1)
   936b7:	vmovdqu %ymm0,0x80(%r15,%r14,1)
   936c1:	mov    0x130(%rsp),%rax
   936c9:	mov    0x8(%rax),%rcx
   936cd:	mov    0x20(%rax),%r12
   936d1:	mov    0x38(%rax),%r9
   936d5:	mov    0x50(%rax),%rax
   936d9:	mov    %rax,0xc0(%rsp)
   936e1:	mov    %rcx,0xb8(%rsp)
   936e9:	lea    0x40(%rcx),%rax
   936ed:	mov    %rax,0x120(%rsp)
   936f5:	xor    %eax,%eax
   936f7:	vmovdqa -0x8a78f(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   936ff:	vmovdqa -0x8aae7(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   93707:	vmovdqa -0x8af4f(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   9370f:	vmovdqa -0x8ac37(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   93717:	vmovdqa -0x8b41f(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   9371f:	vmovdqa -0x8b6e7(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   93727:	vmovdqa -0x8aeaf(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   9372f:	vmovdqa -0x8b7e7(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   93737:	vpbroadcastb -0x8a03a(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   93740:	vpbroadcastb -0x8a042(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   93749:	vpbroadcastb -0x8a04a(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   93752:	mov    %r12,0x58(%rsp)
   93757:	mov    %r14,0xc8(%rsp)
   9375f:	mov    %r15,0xd0(%rsp)
   93767:	mov    %r9,0x48(%rsp)
   9376c:	jmp    937aa <sessions::fast::parse_events_avx2+0x232a>
   9376e:	xchg   %ax,%ax
   93770:	mov    0xe0(%rsp),%rax
   93778:	mov    %rax,0x110(%rsp)
   93780:	mov    %r13d,%eax
   93783:	mov    0xb0(%rsp),%rcx
   9378b:	add    %rax,%rcx
   9378e:	mov    %rcx,%rax
   93791:	mov    0xc8(%rsp),%r14
   93799:	mov    0xd0(%rsp),%r15
   937a1:	cmp    %r14,%rax
   937a4:	jae    957c6 <sessions::fast::parse_events_avx2+0x4346>
   937aa:	sub    %rax,%r14
   937ad:	cmp    $0x8000,%r14
   937b4:	mov    $0x8000,%r10d
   937ba:	cmovb  %r14,%r10
   937be:	lea    (%r15,%rax,1),%rcx
   937c2:	mov    %rcx,0x10(%rsp)
   937c7:	mov    %r14,0x78(%rsp)
   937cc:	test   %r14,%r14
   937cf:	mov    %rax,0xb0(%rsp)
   937d7:	je     93a90 <sessions::fast::parse_events_avx2+0x2610>
   937dd:	mov    $0xffffffffffffffff,%rax
   937e4:	shlx   %r10,%rax,%rax
   937e9:	not    %rax
   937ec:	mov    %rax,0x60(%rsp)
   937f1:	xor    %r11d,%r11d
   937f4:	xor    %edx,%edx
   937f6:	xor    %ebp,%ebp
   937f8:	xor    %edi,%edi
   937fa:	mov    %r10,0x8(%rsp)
   937ff:	jmp    93832 <sessions::fast::parse_events_avx2+0x23b2>
   93801:	data16 data16 data16 data16 data16 cs nopw 0x0(%rax,%rax,1)
   93810:	add    %r10,%r11
   93813:	popcnt %r9,%rax
   93818:	add    %eax,%edx
   9381a:	mov    0x8(%rsp),%r10
   9381f:	mov    0x38(%rsp),%rdi
   93824:	cmp    %r10,%rdi
   93827:	mov    0x58(%rsp),%r12
   9382c:	jae    93a70 <sessions::fast::parse_events_avx2+0x25f0>
   93832:	mov    0x10(%rsp),%rax
   93837:	vmovdqu (%rax,%rdi,1),%ymm0
   9383c:	vmovdqu 0x20(%rax,%rdi,1),%ymm1
   93842:	vpcmpeqb %ymm4,%ymm0,%ymm2
   93846:	vpmovmskb %ymm2,%r8d
   9384a:	vpcmpeqb %ymm4,%ymm1,%ymm2
   9384e:	vpmovmskb %ymm2,%ebx
   93852:	shl    $0x20,%rbx
   93856:	or     %r8,%rbx
   93859:	vpcmpeqb %ymm5,%ymm0,%ymm2
   9385d:	vpmovmskb %ymm2,%r8d
   93861:	vpcmpeqb %ymm5,%ymm1,%ymm2
   93865:	vpmovmskb %ymm2,%eax
   93869:	shl    $0x20,%rax
   9386d:	or     %r8,%rax
   93870:	vpcmpeqb %ymm6,%ymm0,%ymm0
   93874:	vpmovmskb %ymm0,%r8d
   93878:	vpcmpeqb %ymm6,%ymm1,%ymm0
   9387c:	vpmovmskb %ymm0,%r9d
   93880:	shl    $0x20,%r9
   93884:	or     %r8,%r9
   93887:	lea    0x40(%rdi),%rcx
   9388b:	mov    %rcx,0x38(%rsp)
   93890:	cmp    %r10,%rcx
   93893:	mov    $0xffffffffffffffff,%r14
   9389a:	cmova  0x60(%rsp),%r14
   938a0:	mov    %r11,%r10
   938a3:	and    %r14,%r9
   938a6:	and    %r14,%rbx
   938a9:	and    %rax,%r14
   938ac:	mov    0x48(%rsp),%r8
   938b1:	mov    0xc0(%rsp),%r11
   938b9:	je     938f6 <sessions::fast::parse_events_avx2+0x2476>
   938bb:	nopl   0x0(%rax,%rax,1)
   938c0:	tzcnt  %r14,%rax
   938c5:	bzhi   %rax,%rbx,%rcx
   938ca:	bzhi   %rax,%r9,%rsi
   938cf:	or     %edi,%eax
   938d1:	mov    %eax,(%r12,%rbp,4)
   938d5:	popcnt %rcx,%rax
   938da:	add    %r10d,%eax
   938dd:	mov    %eax,(%r8,%rbp,4)
   938e1:	popcnt %rsi,%rax
   938e6:	add    %edx,%eax
   938e8:	mov    %eax,(%r11,%rbp,4)
   938ec:	inc    %rbp
   938ef:	blsr   %r14,%r14
   938f4:	jne    938c0 <sessions::fast::parse_events_avx2+0x2440>
   938f6:	blsr   %rbx,%rax
   938fb:	blsr   %rax,%r11
   93900:	blsr   %r11,%r12
   93905:	blsr   %r12,%rsi
   9390a:	blsr   %rsi,%r15
   9390f:	blsr   %r15,%r13
   93914:	blsr   %r13,%r14
   93919:	tzcnt  %r14,%rcx
   9391e:	tzcnt  %r13,%r13
   93923:	tzcnt  %r15,%r15
   93928:	tzcnt  %r12,%r12
   9392d:	tzcnt  %r11,%r11
   93932:	tzcnt  %rax,%rax
   93937:	tzcnt  %rbx,%r8
   9393c:	vmovd  %r8d,%xmm0
   93941:	vpinsrd $0x1,%eax,%xmm0,%xmm0
   93947:	vpinsrd $0x2,%r11d,%xmm0,%xmm0
   9394d:	vpinsrd $0x3,%r12d,%xmm0,%xmm0
   93953:	tzcnt  %rsi,%rax
   93958:	vmovd  %eax,%xmm1
   9395c:	vpinsrd $0x1,%r15d,%xmm1,%xmm1
   93962:	vpinsrd $0x2,%r13d,%xmm1,%xmm1
   93968:	vpinsrd $0x3,%ecx,%xmm1,%xmm1
   9396e:	vinserti128 $0x1,%xmm1,%ymm0,%ymm1
   93974:	vmovd  %edi,%xmm0
   93978:	vpbroadcastd %xmm0,%ymm0
   9397d:	vpaddd %ymm0,%ymm1,%ymm1
   93981:	mov    0xb8(%rsp),%rax
   93989:	vmovdqu %ymm1,(%rax,%r10,4)
   9398f:	popcnt %rbx,%r11
   93994:	cmp    $0x9,%r11
   93998:	jb     93810 <sessions::fast::parse_events_avx2+0x2390>
   9399e:	blsr   %r14,%rax
   939a3:	blsr   %rax,%rcx
   939a8:	blsr   %rcx,%rsi
   939ad:	blsr   %rsi,%r8
   939b2:	blsr   %r8,%rbx
   939b7:	blsr   %rbx,%r14
   939bc:	blsr   %r14,%r15
   939c1:	blsr   %r15,%r12
   939c6:	tzcnt  %r12,%r13
   939cb:	tzcnt  %r15,%r15
   939d0:	tzcnt  %r14,%r14
   939d5:	tzcnt  %r8,%r8
   939da:	tzcnt  %rsi,%rsi
   939df:	tzcnt  %rcx,%rcx
   939e4:	tzcnt  %rax,%rax
   939e9:	vmovd  %eax,%xmm1
   939ed:	vpinsrd $0x1,%ecx,%xmm1,%xmm1
   939f3:	vpinsrd $0x2,%esi,%xmm1,%xmm1
   939f9:	vpinsrd $0x3,%r8d,%xmm1,%xmm1
   939ff:	tzcnt  %rbx,%rax
   93a04:	vmovd  %eax,%xmm2
   93a08:	vpinsrd $0x1,%r14d,%xmm2,%xmm2
   93a0e:	vpinsrd $0x2,%r15d,%xmm2,%xmm2
   93a14:	vpinsrd $0x3,%r13d,%xmm2,%xmm2
   93a1a:	vinserti128 $0x1,%xmm2,%ymm1,%ymm1
   93a20:	vpaddd %ymm0,%ymm1,%ymm0
   93a24:	mov    0xb8(%rsp),%rax
   93a2c:	vmovdqu %ymm0,0x20(%rax,%r10,4)
   93a33:	blsr   %r12,%rbx
   93a38:	je     93810 <sessions::fast::parse_events_avx2+0x2390>
   93a3e:	mov    0x120(%rsp),%rax
   93a46:	lea    (%rax,%r10,4),%r14
   93a4a:	nopw   0x0(%rax,%rax,1)
   93a50:	tzcnt  %rbx,%rax
   93a55:	or     %edi,%eax
   93a57:	mov    %eax,(%r14)
   93a5a:	add    $0x4,%r14
   93a5e:	blsr   %rbx,%rbx
   93a63:	jne    93a50 <sessions::fast::parse_events_avx2+0x25d0>
   93a65:	jmp    93810 <sessions::fast::parse_events_avx2+0x2390>
   93a6a:	nopw   0x0(%rax,%rax,1)
   93a70:	mov    0xd0(%rsp),%r15
   93a78:	mov    0xb0(%rsp),%rax
   93a80:	lea    (%r10,%rax,1),%rsi
   93a84:	cmp    0xc8(%rsp),%rsi
   93a8c:	je     93aa5 <sessions::fast::parse_events_avx2+0x2625>
   93a8e:	jmp    93ab6 <sessions::fast::parse_events_avx2+0x2636>
   93a90:	xor    %ebp,%ebp
   93a92:	xor    %edx,%edx
   93a94:	xor    %r11d,%r11d
   93a97:	lea    (%r10,%rax,1),%rsi
   93a9b:	cmp    0xc8(%rsp),%rsi
   93aa3:	jne    93ab6 <sessions::fast::parse_events_avx2+0x2636>
   93aa5:	mov    0x10(%rsp),%rax
   93aaa:	cmpb   $0xa,-0x1(%rax,%r10,1)
   93ab0:	jne    956f0 <sessions::fast::parse_events_avx2+0x4270>
   93ab6:	mov    0x48(%rsp),%r9
   93abb:	test   %rbp,%rbp
   93abe:	je     95714 <sessions::fast::parse_events_avx2+0x4294>
   93ac4:	mov    0x110(%rsp),%rax
   93acc:	mov    %rax,0xe0(%rsp)
   93ad4:	mov    0xf8(%rsp),%rax
   93adc:	mov    %rax,0x20(%rsp)
   93ae1:	mov    0x100(%rsp),%rax
   93ae9:	mov    %rax,0xf0(%rsp)
   93af1:	mov    0x108(%rsp),%rdi
   93af9:	xor    %r13d,%r13d
   93afc:	xor    %esi,%esi
   93afe:	xor    %r8d,%r8d
   93b01:	xor    %r14d,%r14d
   93b04:	mov    %rdi,0xd8(%rsp)
   93b0c:	jmp    93b36 <sessions::fast::parse_events_avx2+0x26b6>
   93b0e:	mov    0x58(%rsp),%r12
   93b13:	mov    0x48(%rsp),%r9
   93b18:	mov    0x78(%rsp),%rsi
   93b1d:	mov    0x54(%rsp),%r8d
   93b22:	mov    0x2c(%rsp),%r14d
   93b27:	inc    %rsi
   93b2a:	inc    %r13d
   93b2d:	cmp    %rbp,%rsi
   93b30:	je     93770 <sessions::fast::parse_events_avx2+0x22f0>
   93b36:	mov    %r14d,%ebx
   93b39:	mov    %r8d,%ecx
   93b3c:	mov    %r13d,%eax
   93b3f:	mov    (%r12,%rsi,4),%r13d
   93b43:	mov    (%r9,%rsi,4),%r8d
   93b47:	mov    0xc0(%rsp),%rdx
   93b4f:	mov    (%rdx,%rsi,4),%r14d
   93b53:	cmp    %eax,%r13d
   93b56:	jbe    93b27 <sessions::fast::parse_events_avx2+0x26a7>
   93b58:	mov    %r8d,%edx
   93b5b:	sub    %ecx,%edx
   93b5d:	cmp    $0x6,%edx
   93b60:	jne    93b27 <sessions::fast::parse_events_avx2+0x26a7>
   93b62:	mov    %eax,%r11d
   93b65:	mov    %r8d,0x54(%rsp)
   93b6a:	mov    %rsi,0x78(%rsp)
   93b6f:	mov    %ecx,%ecx
   93b71:	mov    0xb8(%rsp),%r9
   93b79:	vmovdqu (%r9,%rcx,4),%xmm7
   93b7f:	mov    0xc(%r9,%rcx,4),%edx
   93b84:	mov    0x8(%r9,%rcx,4),%esi
   93b89:	mov    (%r9,%rcx,4),%r10d
   93b8d:	mov    0x4(%r9,%rcx,4),%r8d
   93b92:	lea    0x1(%r10),%r15d
   93b96:	lea    0x1(%r8),%eax
   93b9a:	mov    %eax,0x40(%rsp)
   93b9e:	lea    0x1(%rsi),%eax
   93ba1:	mov    %eax,0x60(%rsp)
   93ba5:	lea    0x1(%rdx),%eax
   93ba8:	mov    %eax,0x38(%rsp)
   93bac:	mov    0x10(%r9,%rcx,4),%eax
   93bb1:	lea    0x1(%rax),%edi
   93bb4:	mov    0x14(%r9,%rcx,4),%r9d
   93bb9:	lea    0x1(%r9),%ecx
   93bbd:	mov    %ecx,0x8(%rsp)
   93bc1:	mov    %r14d,%ecx
   93bc4:	sub    %ebx,%ecx
   93bc6:	jne    93c00 <sessions::fast::parse_events_avx2+0x2780>
   93bc8:	mov    %rax,0xa8(%rsp)
   93bd0:	mov    %r13d,%ecx
   93bd3:	mov    0x8(%rsp),%r10d
   93bd8:	mov    0x38(%rsp),%eax
   93bdc:	mov    0x60(%rsp),%r8d
   93be1:	vmovd  %xmm7,%esi
   93be5:	sub    %r11d,%esi
   93be8:	jne    93e2a <sessions::fast::parse_events_avx2+0x29aa>
   93bee:	mov    0x78(%rsp),%rsi
   93bf3:	mov    0x54(%rsp),%r8d
   93bf8:	jmp    94867 <sessions::fast::parse_events_avx2+0x33e7>
   93bfd:	nopl   (%rax)
   93c00:	mov    %r14d,0x2c(%rsp)
   93c05:	mov    %r9,0x30(%rsp)
   93c0a:	mov    %r11d,%r9d
   93c0d:	mov    %r15d,%ebx
   93c10:	mov    %edi,%r15d
   93c13:	mov    %r10d,%edi
   93c16:	cmp    $0x1,%r10d
   93c1a:	adc    $0xffffffffffffffff,%rdi
   93c1e:	mov    %r11d,0xa8(%rsp)
   93c26:	vpinsrd $0x3,%r11d,%xmm7,%xmm0
   93c2c:	vpshufd $0x93,%xmm0,%xmm0
   93c31:	mov    %ebx,0x1c(%rsp)
   93c35:	mov    %ebx,%r10d
   93c38:	mov    %r8d,%r11d
   93c3b:	cmp    $0x1,%r8d
   93c3f:	adc    $0xffffffffffffffff,%r11
   93c43:	mov    0x40(%rsp),%r8d
   93c48:	mov    %esi,%ebx
   93c4a:	cmp    $0x1,%esi
   93c4d:	adc    $0xffffffffffffffff,%rbx
   93c51:	mov    0x60(%rsp),%esi
   93c55:	mov    %edx,%r14d
   93c58:	cmp    $0x1,%edx
   93c5b:	adc    $0xffffffffffffffff,%r14
   93c5f:	mov    0x10(%rsp),%r12
   93c64:	movzbl (%r12,%r9,1),%r9d
   93c69:	vmovd  %r9d,%xmm1
   93c6e:	vpinsrb $0x1,(%r12,%r10,1),%xmm1,%xmm1
   93c75:	vpinsrb $0x2,(%r12,%r8,1),%xmm1,%xmm1
   93c7c:	vpinsrb $0x3,(%r12,%rsi,1),%xmm1,%xmm1
   93c83:	vpaddd -0x8b19b(%rip),%xmm0,%xmm0        # 8af0 <__abi_tag+0x87f4>
   93c8b:	vmovdqa -0x8bcc3(%rip),%xmm3        # 7fd0 <__abi_tag+0x7cd4>
   93c93:	vpcmpeqb %xmm3,%xmm1,%xmm1
   93c97:	movzbl (%r12,%rdi,1),%esi
   93c9c:	vmovd  %esi,%xmm2
   93ca0:	vpinsrb $0x1,(%r12,%r11,1),%xmm2,%xmm2
   93ca7:	vpinsrb $0x2,(%r12,%rbx,1),%xmm2,%xmm2
   93cae:	vpinsrb $0x3,(%r12,%r14,1),%xmm2,%xmm2
   93cb5:	vpcmpeqb %xmm3,%xmm2,%xmm2
   93cb9:	vpand  %xmm2,%xmm1,%xmm1
   93cbd:	vpmaxud %xmm0,%xmm7,%xmm0
   93cc2:	vpcmpeqd %xmm0,%xmm7,%xmm0
   93cc6:	vpmovsxbd %xmm1,%xmm1
   93ccb:	vpand  %xmm0,%xmm1,%xmm0
   93ccf:	vpsrld $0x1f,%xmm0,%xmm1
   93cd4:	vmovd  %xmm1,%edi
   93cd8:	vpextrd $0x1,%xmm1,%r9d
   93cde:	vpextrd $0x2,%xmm1,%esi
   93ce4:	vpextrd $0x3,%xmm1,%r8d
   93cea:	mov    %r9,0xa0(%rsp)
   93cf2:	lea    (%rsi,%r8,1),%r10d
   93cf6:	add    %edi,%r10d
   93cf9:	add    %r9d,%r10d
   93cfc:	mov    0x38(%rsp),%r11d
   93d01:	movzbl (%r12,%r11,1),%r11d
   93d06:	xor    $0x22,%r11b
   93d0a:	cmp    $0x1,%rax
   93d0e:	mov    %rax,%rbx
   93d11:	adc    $0xffffffffffffffff,%rbx
   93d15:	movzbl (%r12,%rbx,1),%ebx
   93d1a:	xor    $0x22,%bl
   93d1d:	add    $0x3,%edx
   93d20:	cmp    %edx,%eax
   93d22:	setae  %dl
   93d25:	or     %r11b,%bl
   93d28:	sete   %r11b
   93d2c:	and    %dl,%r11b
   93d2f:	movzbl %r11b,%edx
   93d33:	mov    %r15d,0x50(%rsp)
   93d38:	mov    %r15d,%r11d
   93d3b:	movzbl (%r12,%r11,1),%r11d
   93d40:	xor    $0x22,%r11b
   93d44:	mov    0x30(%rsp),%r9
   93d49:	cmp    $0x1,%r9
   93d4d:	mov    %r9,%rbx
   93d50:	adc    $0xffffffffffffffff,%rbx
   93d54:	movzbl (%r12,%rbx,1),%ebx
   93d59:	xor    $0x22,%bl
   93d5c:	lea    0x3(%rax),%r14d
   93d60:	cmp    %r14d,%r9d
   93d63:	setae  %r14b
   93d67:	or     %r11b,%bl
   93d6a:	sete   %r11b
   93d6e:	and    %r14b,%r11b
   93d71:	movzbl %r11b,%r11d
   93d75:	mov    0x8(%rsp),%ebx
   93d79:	movzbl (%r12,%rbx,1),%ebx
   93d7e:	xor    $0x22,%bl
   93d81:	movzbl -0x1(%r12,%r13,1),%r14d
   93d87:	xor    $0x22,%r14b
   93d8b:	lea    0x3(%r9),%r12d
   93d8f:	cmp    %r12d,%r13d
   93d92:	setae  %r12b
   93d96:	or     %bl,%r14b
   93d99:	lea    (%rdx,%r11,1),%r14d
   93d9d:	sete   %bl
   93da0:	and    %r12b,%bl
   93da3:	movzbl %bl,%ebx
   93da6:	add    %ebx,%r14d
   93da9:	add    %r10d,%r14d
   93dac:	add    %r14d,%r14d
   93daf:	cmp    %ecx,%r14d
   93db2:	jne    93b0e <sessions::fast::parse_events_avx2+0x268e>
   93db8:	mov    0xa8(%rsp),%r14d
   93dc0:	add    %edi,%r14d
   93dc3:	mov    0x1c(%rsp),%r15d
   93dc8:	add    0xa0(%rsp),%r15d
   93dd0:	add    %esi,0x40(%rsp)
   93dd4:	mov    0x60(%rsp),%esi
   93dd8:	add    %r8d,%esi
   93ddb:	mov    0x38(%rsp),%r8d
   93de0:	add    %edx,%r8d
   93de3:	sub    %edx,%eax
   93de5:	mov    %rax,0xa8(%rsp)
   93ded:	mov    0x50(%rsp),%edi
   93df1:	add    %r11d,%edi
   93df4:	sub    %r11d,%r9d
   93df7:	mov    0x8(%rsp),%r10d
   93dfc:	add    %ebx,%r10d
   93dff:	mov    %r13d,%ecx
   93e02:	sub    %ebx,%ecx
   93e04:	vpaddd %xmm0,%xmm7,%xmm7
   93e08:	mov    0x58(%rsp),%r12
   93e0d:	mov    0x2c(%rsp),%edx
   93e11:	mov    %r8d,%eax
   93e14:	mov    %esi,%r8d
   93e17:	mov    %r14d,%r11d
   93e1a:	mov    %edx,%r14d
   93e1d:	vmovd  %xmm7,%esi
   93e21:	sub    %r11d,%esi
   93e24:	je     93bee <sessions::fast::parse_events_avx2+0x276e>
   93e2a:	vmovdqa %xmm7,0x60(%rsp)
   93e30:	mov    %rcx,0x118(%rsp)
   93e38:	mov    %eax,0x38(%rsp)
   93e3c:	mov    %edi,0x50(%rsp)
   93e40:	mov    %r15d,0x1c(%rsp)
   93e45:	mov    %r11d,%edi
   93e48:	cmp    $0xa,%esi
   93e4b:	ja     9468b <sessions::fast::parse_events_avx2+0x320b>
   93e51:	mov    0x10(%rsp),%rax
   93e56:	vmovdqu (%rax,%rdi,1),%xmm1
   93e5b:	vmovd  %esi,%xmm0
   93e5f:	vpbroadcastb %xmm0,%xmm0
   93e64:	vpcmpgtb %xmm8,%xmm0,%xmm0
   93e69:	vpaddb %xmm1,%xmm9,%xmm2
   93e6d:	vpminub %xmm2,%xmm10,%xmm3
   93e71:	vpcmpeqb %xmm3,%xmm2,%xmm2
   93e75:	vpaddb %xmm1,%xmm11,%xmm3
   93e79:	vpminub %xmm3,%xmm12,%xmm4
   93e7d:	vpcmpeqb %xmm4,%xmm3,%xmm3
   93e81:	vpaddb %xmm1,%xmm13,%xmm4
   93e85:	vpminub %xmm4,%xmm12,%xmm5
   93e89:	vpcmpeqb %xmm5,%xmm4,%xmm5
   93e8d:	vpcmpeqb %xmm1,%xmm14,%xmm4
   93e91:	vpor   %xmm2,%xmm3,%xmm6
   93e95:	vpor   %xmm5,%xmm4,%xmm7
   93e99:	vpor   %xmm6,%xmm7,%xmm6
   93e9d:	vpandn %xmm0,%xmm6,%xmm6
   93ea1:	vpmovmskb %xmm6,%eax
   93ea5:	test   %eax,%eax
   93ea7:	jne    9468b <sessions::fast::parse_events_avx2+0x320b>
   93ead:	vpaddb %xmm1,%xmm15,%xmm6
   93eb1:	vpand  %xmm6,%xmm5,%xmm5
   93eb5:	vpaddb -0x8affd(%rip),%xmm1,%xmm6        # 8ec0 <__abi_tag+0x8bc4>
   93ebd:	vpand  %xmm6,%xmm3,%xmm3
   93ec1:	vpaddb -0x8ba39(%rip),%xmm1,%xmm1        # 8490 <__abi_tag+0x8194>
   93ec9:	vpand  %xmm1,%xmm2,%xmm1
   93ecd:	vpor   %xmm3,%xmm1,%xmm1
   93ed1:	vpand  -0x8b649(%rip),%xmm4,%xmm2        # 8890 <__abi_tag+0x8594>
   93ed9:	vpor   %xmm2,%xmm5,%xmm2
   93edd:	vpor   %xmm1,%xmm2,%xmm1
   93ee1:	vpand  %xmm1,%xmm0,%xmm0
   93ee5:	vpmaddubsw -0x8bf8e(%rip),%xmm0,%xmm0        # 7f60 <__abi_tag+0x7c64>
   93eee:	vpmaddwd -0x8b656(%rip),%xmm0,%xmm0        # 88a0 <__abi_tag+0x85a4>
   93ef6:	vpextrd $0x1,%xmm0,%edx
   93efc:	vmovd  %xmm0,%ecx
   93f00:	vpextrd $0x2,%xmm0,%eax
   93f06:	shl    $0x24,%rcx
   93f0a:	shl    $0xc,%rdx
   93f0e:	or     %rcx,%rdx
   93f11:	shr    $0xc,%eax
   93f14:	or     %rdx,%rax
   93f17:	mov    %r8d,%ebx
   93f1a:	vmovdqa 0x60(%rsp),%xmm0
   93f20:	vpextrd $0x3,%xmm0,%esi
   93f26:	add    0x10(%rsp),%rbx
   93f2b:	mov    %esi,%ecx
   93f2d:	sub    %r8d,%ecx
   93f30:	cmp    $0x19,%rcx
   93f34:	mov    %r13,0xa0(%rsp)
   93f3c:	mov    %r14d,0x2c(%rsp)
   93f41:	mov    %rax,0x128(%rsp)
   93f49:	je     940ed <sessions::fast::parse_events_avx2+0x2c6d>
   93f4f:	cmp    $0x14,%ecx
   93f52:	jne    9433d <sessions::fast::parse_events_avx2+0x2ebd>
   93f58:	cmpb   $0x5a,0x13(%rbx)
   93f5c:	vpbroadcastb -0x8a85f(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   93f65:	vpbroadcastb -0x8a867(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   93f6e:	vpbroadcastb -0x8a86f(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   93f77:	jne    94444 <sessions::fast::parse_events_avx2+0x2fc4>
   93f7d:	mov    %r10d,%r13d
   93f80:	mov    %r9,0x30(%rsp)
   93f85:	mov    (%rbx),%rdx
   93f88:	mov    0x20(%rsp),%rsi
   93f8d:	mov    0x8e0(%rsi),%rax
   93f94:	imul   %rdx,%rax
   93f98:	shr    $0x3c,%rax
   93f9c:	cmp    %rdx,0x698(%rsi,%rax,8)
   93fa4:	jne    9528a <sessions::fast::parse_events_avx2+0x3e0a>
   93faa:	mov    0x718(%rsi,%rax,8),%rcx
   93fb2:	mov    0x798(%rsi,%rax,8),%rdx
   93fba:	movabs $0x7676767676767676,%r9
   93fc4:	movabs $0x3030303030303030,%r8
   93fce:	movzwl 0x8(%rbx),%esi
   93fd2:	xor    $0x3030,%rsi
   93fd9:	mov    0xb(%rbx),%rdi
   93fdd:	mov    %rdi,%rax
   93fe0:	xor    %r8,%rax
   93fe3:	lea    0x7676(%rsi),%r8d
   93fea:	or     %esi,%r8d
   93fed:	and    $0x8080,%r8d
   93ff4:	add    %rax,%r9
   93ff7:	or     %rdi,%r9
   93ffa:	movabs $0x8080008080008080,%r10
   94004:	and    %r10,%r9
   94007:	xor    %r10d,%r10d
   9400a:	cmpb   $0x54,0xa(%rbx)
   9400e:	setne  %r10b
   94012:	movabs $0xff0000ff0000,%r11
   9401c:	and    %r11,%rdi
   9401f:	or     %r10,%rdi
   94022:	or     %r9,%rdi
   94025:	or     %r8,%rdi
   94028:	movabs $0x3a00003a0000,%r8
   94032:	cmp    %r8,%rdi
   94035:	jne    9475d <sessions::fast::parse_events_avx2+0x32dd>
   9403b:	lea    (%rax,%rax,4),%rdi
   9403f:	shr    $0x8,%rax
   94043:	lea    (%rax,%rdi,2),%r9
   94047:	mov    %r9,%rax
   9404a:	shr    $0x30,%rax
   9404e:	movzbl %al,%edi
   94051:	xor    %eax,%eax
   94053:	cmp    $0x3b,%rdi
   94057:	ja     94738 <sessions::fast::parse_events_avx2+0x32b8>
   9405d:	mov    %r9d,%r8d
   94060:	shr    $0x18,%r8d
   94064:	cmp    $0x3b,%r8d
   94068:	ja     94738 <sessions::fast::parse_events_avx2+0x32b8>
   9406e:	mov    $0xffffffff,%r15d
   94074:	movzbl %r9b,%ebx
   94078:	cmp    $0x17,%ebx
   9407b:	ja     94765 <sessions::fast::parse_events_avx2+0x32e5>
   94081:	movzbl %sil,%r10d
   94085:	lea    (%r10,%r10,4),%r10
   94089:	shr    $0x8,%esi
   9408c:	lea    (%rsi,%r10,2),%rsi
   94090:	test   %rsi,%rsi
   94093:	je     94765 <sessions::fast::parse_events_avx2+0x32e5>
   94099:	movabs $0x7fffffffffffffff,%r10
   940a3:	mov    $0x0,%r9d
   940a9:	cmp    %rdx,%rsi
   940ac:	jg     94772 <sessions::fast::parse_events_avx2+0x32f2>
   940b2:	add    %rcx,%rsi
   940b5:	imul   $0x15180,%rsi,%rax
   940bc:	imul   $0xe10,%rbx,%rcx
   940c3:	imul   $0x3c,%r8,%rdx
   940c7:	add    %rdi,%rcx
   940ca:	add    %rdx,%rcx
   940cd:	add    %rax,%rcx
   940d0:	imul   $0x3e8,%rcx,%rax
   940d7:	add    $0xfffffffffad9a400,%rax
   940dd:	mov    0x30(%rsp),%r9
   940e2:	mov    %r13d,%r10d
   940e5:	mov    %rax,%r13
   940e8:	jmp    944af <sessions::fast::parse_events_avx2+0x302f>
   940ed:	movzbl 0x13(%rbx),%r14d
   940f2:	cmp    $0x2b,%r14d
   940f6:	vpbroadcastb -0x8a9f9(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   940ff:	vpbroadcastb -0x8aa01(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   94108:	vpbroadcastb -0x8aa09(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   94111:	je     9411d <sessions::fast::parse_events_avx2+0x2c9d>
   94113:	cmp    $0x2d,%r14d
   94117:	jne    94444 <sessions::fast::parse_events_avx2+0x2fc4>
   9411d:	mov    %r10d,0x8(%rsp)
   94122:	mov    %r9,0x30(%rsp)
   94127:	mov    (%rbx),%rdx
   9412a:	mov    0x20(%rsp),%rcx
   9412f:	mov    0x8e0(%rcx),%rax
   94136:	imul   %rdx,%rax
   9413a:	shr    $0x3c,%rax
   9413e:	cmp    %rdx,0x698(%rcx,%rax,8)
   94146:	jne    951ef <sessions::fast::parse_events_avx2+0x3d6f>
   9414c:	mov    0x718(%rcx,%rax,8),%r11
   94154:	mov    0x798(%rcx,%rax,8),%rdi
   9415c:	movzwl 0x8(%rbx),%r9d
   94161:	xor    $0x3030,%r9
   94168:	mov    0xb(%rbx),%rdx
   9416c:	mov    %rdx,%rax
   9416f:	movabs $0x3030303030303030,%rcx
   94179:	xor    %rcx,%rax
   9417c:	lea    0x7676(%r9),%ecx
   94183:	or     %r9d,%ecx
   94186:	and    $0x8080,%ecx
   9418c:	movabs $0x7676767676767676,%rsi
   94196:	add    %rax,%rsi
   94199:	or     %rdx,%rsi
   9419c:	movabs $0x8080008080008080,%r8
   941a6:	and    %r8,%rsi
   941a9:	xor    %r8d,%r8d
   941ac:	cmpb   $0x54,0xa(%rbx)
   941b0:	setne  %r8b
   941b4:	movabs $0xff0000ff0000,%r10
   941be:	and    %r10,%rdx
   941c1:	or     %r8,%rdx
   941c4:	or     %rsi,%rdx
   941c7:	or     %rcx,%rdx
   941ca:	movabs $0x3a00003a0000,%rcx
   941d4:	cmp    %rcx,%rdx
   941d7:	jne    9475d <sessions::fast::parse_events_avx2+0x32dd>
   941dd:	lea    (%rax,%rax,4),%rcx
   941e1:	shr    $0x8,%rax
   941e5:	lea    (%rax,%rcx,2),%rcx
   941e9:	mov    %rcx,%rax
   941ec:	shr    $0x30,%rax
   941f0:	movzbl %al,%edx
   941f3:	xor    %eax,%eax
   941f5:	cmp    $0x3b,%rdx
   941f9:	ja     94738 <sessions::fast::parse_events_avx2+0x32b8>
   941ff:	mov    %ecx,%esi
   94201:	shr    $0x18,%esi
   94204:	cmp    $0x3b,%esi
   94207:	ja     94738 <sessions::fast::parse_events_avx2+0x32b8>
   9420d:	movzbl %cl,%r8d
   94211:	cmp    $0x17,%r8d
   94215:	ja     94738 <sessions::fast::parse_events_avx2+0x32b8>
   9421b:	movzbl %r9b,%ecx
   9421f:	lea    (%rcx,%rcx,4),%rcx
   94223:	shr    $0x8,%r9d
   94227:	lea    (%r9,%rcx,2),%r13
   9422b:	test   %r13,%r13
   9422e:	je     94738 <sessions::fast::parse_events_avx2+0x32b8>
   94234:	cmp    %rdi,%r13
   94237:	jg     94738 <sessions::fast::parse_events_avx2+0x32b8>
   9423d:	cmpb   $0x3a,0x16(%rbx)
   94241:	jne    9475d <sessions::fast::parse_events_avx2+0x32dd>
   94247:	mov    $0xffffffff,%r15d
   9424d:	movzbl 0x14(%rbx),%edi
   94251:	add    $0xd0,%dil
   94255:	xor    %eax,%eax
   94257:	cmp    $0x9,%dil
   9425b:	ja     94765 <sessions::fast::parse_events_avx2+0x32e5>
   94261:	movzbl 0x15(%rbx),%r10d
   94266:	add    $0xd0,%r10b
   9426a:	cmp    $0x9,%r10b
   9426e:	ja     94765 <sessions::fast::parse_events_avx2+0x32e5>
   94274:	movzbl 0x17(%rbx),%ecx
   94278:	add    $0xd0,%cl
   9427b:	cmp    $0x9,%cl
   9427e:	ja     94765 <sessions::fast::parse_events_avx2+0x32e5>
   94284:	mov    %r11,0x60(%rsp)
   94289:	movzbl 0x18(%rbx),%r11d
   9428e:	add    $0xd0,%r11b
   94292:	cmp    $0x9,%r11b
   94296:	ja     94765 <sessions::fast::parse_events_avx2+0x32e5>
   9429c:	movzbl %dil,%eax
   942a0:	add    %eax,%eax
   942a2:	lea    (%rax,%rax,4),%edi
   942a5:	add    %r10b,%dil
   942a8:	xor    %eax,%eax
   942aa:	cmp    $0x17,%dil
   942ae:	ja     94765 <sessions::fast::parse_events_avx2+0x32e5>
   942b4:	movzbl %cl,%ecx
   942b7:	add    %ecx,%ecx
   942b9:	lea    (%rcx,%rcx,4),%ebx
   942bc:	add    %r11b,%bl
   942bf:	movabs $0x7fffffffffffffff,%r10
   942c9:	mov    $0x0,%r9d
   942cf:	cmp    $0x3b,%bl
   942d2:	ja     94772 <sessions::fast::parse_events_avx2+0x32f2>
   942d8:	add    0x60(%rsp),%r13
   942dd:	imul   $0x15180,%r13,%rax
   942e4:	imul   $0xe10,%r8,%rcx
   942eb:	imul   $0x3c,%rsi,%rsi
   942ef:	add    %rdx,%rcx
   942f2:	add    %rsi,%rcx
   942f5:	add    %rax,%rcx
   942f8:	imul   $0x3e8,%rcx,%rax
   942ff:	add    $0xfffffffffad9a400,%rax
   94305:	movzbl %bl,%ecx
   94308:	movzbl %dil,%edx
   9430c:	imul   $0x36ee80,%rdx,%rdx
   94313:	imul   $0xea60,%rcx,%rcx
   9431a:	add    %rdx,%rcx
   9431d:	mov    %rcx,%r13
   94320:	neg    %r13
   94323:	cmp    $0x2b,%r14b
   94327:	cmovne %rcx,%r13
   9432b:	add    %rax,%r13
   9432e:	mov    0x30(%rsp),%r9
   94333:	mov    0x8(%rsp),%r10d
   94338:	jmp    944af <sessions::fast::parse_events_avx2+0x302f>
   9433d:	lea    -0x1(%rcx),%edx
   94340:	cmp    $0x10,%edx
   94343:	vpbroadcastb -0x8ac46(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   9434c:	vpbroadcastb -0x8ac4e(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   94355:	vpbroadcastb -0x8ac56(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   9435e:	jae    94432 <sessions::fast::parse_events_avx2+0x2fb2>
   94364:	mov    %r10d,0x8(%rsp)
   94369:	mov    %r9,%r13
   9436c:	cmp    $0x9,%ecx
   9436f:	movabs $0x7676767676767676,%r8
   94379:	movabs $0x3030303030303030,%r9
   94383:	jae    946f3 <sessions::fast::parse_events_avx2+0x3273>
   94389:	lea    0x0(,%rcx,8),%edx
   94390:	xor    %eax,%eax
   94392:	cmp    $0x8,%rcx
   94396:	shrx   %rdx,%r9,%rdx
   9439b:	cmove  %rax,%rdx
   9439f:	neg    %cl
   943a1:	shl    $0x3,%cl
   943a4:	shlx   %rcx,(%rbx),%rcx
   943a9:	or     %rcx,%rdx
   943ac:	xor    %r9,%rdx
   943af:	lea    (%rdx,%r8,1),%rsi
   943b3:	or     %rcx,%rsi
   943b6:	mov    $0xffffffff,%r15d
   943bc:	movabs $0x7fffffffffffffff,%r10
   943c6:	mov    $0x0,%r9d
   943cc:	movabs $0x8080808080808080,%rcx
   943d6:	test   %rcx,%rsi
   943d9:	jne    94772 <sessions::fast::parse_events_avx2+0x32f2>
   943df:	lea    (%rdx,%rdx,4),%rax
   943e3:	shr    $0x8,%rdx
   943e7:	lea    (%rdx,%rax,2),%rsi
   943eb:	mov    %rsi,%rax
   943ee:	movabs $0xff000000ff,%rdx
   943f8:	and    %rdx,%rax
   943fb:	movabs $0xf424000000064,%rcx
   94405:	imul   %rcx,%rax
   94409:	shr    $0x10,%rsi
   9440d:	and    %rdx,%rsi
   94410:	movabs $0x271000000001,%rcx
   9441a:	imul   %rcx,%rsi
   9441e:	add    %rax,%rsi
   94421:	shr    $0x20,%rsi
   94425:	mov    %r13,%r9
   94428:	mov    0x8(%rsp),%r10d
   9442d:	mov    %rsi,%r13
   94430:	jmp    944af <sessions::fast::parse_events_avx2+0x302f>
   94432:	cmp    %r8d,%esi
   94435:	jne    94444 <sessions::fast::parse_events_avx2+0x2fc4>
   94437:	xor    %eax,%eax
   94439:	mov    $0xffffffff,%r15d
   9443f:	jmp    94765 <sessions::fast::parse_events_avx2+0x32e5>
   94444:	xor    %edx,%edx
   94446:	xor    %eax,%eax
   94448:	xor    %esi,%esi
   9444a:	xor    %r13d,%r13d
   9444d:	nopl   (%rax)
   94450:	movzbl (%rbx,%rdx,1),%edi
   94454:	add    $0xd0,%dil
   94458:	mov    $0xffffffff,%r15d
   9445e:	cmp    $0x9,%dil
   94462:	ja     94763 <sessions::fast::parse_events_avx2+0x32e3>
   94468:	test   %dil,%dil
   9446b:	setne  %r8b
   9446f:	or     %r8b,%sil
   94472:	movzbl %sil,%r8d
   94476:	and    $0x1,%r8d
   9447a:	add    %r8d,%eax
   9447d:	lea    0x0(,%r13,4),%r8
   94485:	add    %r13,%r8
   94488:	movzbl %dil,%edi
   9448c:	lea    (%rdi,%r8,2),%r13
   94490:	inc    %rdx
   94493:	cmp    %rdx,%rcx
   94496:	jne    94450 <sessions::fast::parse_events_avx2+0x2fd0>
   94498:	cmp    $0x14,%eax
   9449b:	setb   %al
   9449e:	test   %r13,%r13
   944a1:	setns  %cl
   944a4:	and    %al,%cl
   944a6:	cmp    $0x1,%cl
   944a9:	jne    94763 <sessions::fast::parse_events_avx2+0x32e3>
   944af:	vpextrd $0x1,%xmm0,%edi
   944b5:	mov    0x1c(%rsp),%r8d
   944ba:	xor    %eax,%eax
   944bc:	mov    $0xffffffff,%r15d
   944c2:	cmp    %r8d,%edi
   944c5:	je     94bdb <sessions::fast::parse_events_avx2+0x375b>
   944cb:	mov    0x50(%rsp),%ecx
   944cf:	cmp    %ecx,%r9d
   944d2:	je     94bdb <sessions::fast::parse_events_avx2+0x375b>
   944d8:	mov    %rcx,0xe8(%rsp)
   944e0:	mov    0x40(%rsp),%esi
   944e4:	mov    %esi,%ebx
   944e6:	vpextrd $0x2,%xmm0,%eax
   944ec:	add    0x10(%rsp),%rbx
   944f1:	mov    %eax,%ecx
   944f3:	sub    %esi,%ecx
   944f5:	cmp    $0x19,%rcx
   944f9:	mov    %r8,0x60(%rsp)
   944fe:	je     94871 <sessions::fast::parse_events_avx2+0x33f1>
   94504:	cmp    $0x14,%ecx
   94507:	jne    94a91 <sessions::fast::parse_events_avx2+0x3611>
   9450d:	cmpb   $0x5a,0x13(%rbx)
   94511:	jne    94b5a <sessions::fast::parse_events_avx2+0x36da>
   94517:	mov    %rdi,0x40(%rsp)
   9451c:	mov    %r10d,0x8(%rsp)
   94521:	mov    %r9,0x30(%rsp)
   94526:	mov    (%rbx),%rdx
   94529:	mov    0x20(%rsp),%rsi
   9452e:	mov    0x8e0(%rsi),%rax
   94535:	imul   %rdx,%rax
   94539:	shr    $0x3c,%rax
   9453d:	cmp    %rdx,0x698(%rsi,%rax,8)
   94545:	jne    95443 <sessions::fast::parse_events_avx2+0x3fc3>
   9454b:	mov    0x718(%rsi,%rax,8),%rcx
   94553:	mov    0x798(%rsi,%rax,8),%rdx
   9455b:	movabs $0x7676767676767676,%r9
   94565:	movabs $0x3030303030303030,%r8
   9456f:	movzwl 0x8(%rbx),%esi
   94573:	xor    $0x3030,%rsi
   9457a:	mov    0xb(%rbx),%rdi
   9457e:	mov    %rdi,%rax
   94581:	xor    %r8,%rax
   94584:	lea    0x7676(%rsi),%r8d
   9458b:	or     %esi,%r8d
   9458e:	and    $0x8080,%r8d
   94595:	add    %rax,%r9
   94598:	or     %rdi,%r9
   9459b:	movabs $0x8080008080008080,%r10
   945a5:	and    %r10,%r9
   945a8:	xor    %r10d,%r10d
   945ab:	cmpb   $0x54,0xa(%rbx)
   945af:	setne  %r10b
   945b3:	movabs $0xff0000ff0000,%r11
   945bd:	and    %r11,%rdi
   945c0:	or     %r10,%rdi
   945c3:	or     %r9,%rdi
   945c6:	or     %r8,%rdi
   945c9:	movabs $0x3a00003a0000,%r8
   945d3:	cmp    %r8,%rdi
   945d6:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   945dc:	lea    (%rax,%rax,4),%rdi
   945e0:	shr    $0x8,%rax
   945e4:	lea    (%rax,%rdi,2),%r9
   945e8:	mov    %r9,%rax
   945eb:	shr    $0x30,%rax
   945ef:	movzbl %al,%edi
   945f2:	xor    %eax,%eax
   945f4:	cmp    $0x3b,%rdi
   945f8:	ja     94bdb <sessions::fast::parse_events_avx2+0x375b>
   945fe:	mov    %r9d,%r8d
   94601:	shr    $0x18,%r8d
   94605:	cmp    $0x3b,%r8d
   94609:	ja     94bdb <sessions::fast::parse_events_avx2+0x375b>
   9460f:	movzbl %r9b,%r9d
   94613:	cmp    $0x17,%r9d
   94617:	ja     94bdb <sessions::fast::parse_events_avx2+0x375b>
   9461d:	movzbl %sil,%r10d
   94621:	lea    (%r10,%r10,4),%r10
   94625:	shr    $0x8,%esi
   94628:	lea    (%rsi,%r10,2),%rsi
   9462c:	test   %rsi,%rsi
   9462f:	je     94bdb <sessions::fast::parse_events_avx2+0x375b>
   94635:	cmp    %rdx,%rsi
   94638:	jg     94bdb <sessions::fast::parse_events_avx2+0x375b>
   9463e:	add    %rcx,%rsi
   94641:	imul   $0x15180,%rsi,%rax
   94648:	imul   $0xe10,%r9,%rcx
   9464f:	imul   $0x3c,%r8,%rdx
   94653:	add    %rdi,%rcx
   94656:	add    %rdx,%rcx
   94659:	add    %rax,%rcx
   9465c:	imul   $0x3e8,%rcx,%r8
   94663:	add    $0xfffffffffad9a400,%r8
   9466a:	mov    0x30(%rsp),%r9
   9466f:	mov    0x8(%rsp),%r10d
   94674:	mov    0x20(%rsp),%rdx
   94679:	cmp    %r8,0x8e8(%rdx)
   94680:	jg     94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94686:	jmp    94d6b <sessions::fast::parse_events_avx2+0x38eb>
   9468b:	add    0x10(%rsp),%rdi
   94690:	mov    %r9,%rbx
   94693:	mov    %r10d,0x8(%rsp)
   94698:	mov    %r8d,%r15d
   9469b:	vzeroupper
   9469e:	call   a11d0 <sessions::fast::keys::intern_exotic>
   946a3:	mov    %r15d,%r8d
   946a6:	mov    0x8(%rsp),%r10d
   946ab:	mov    %rbx,%r9
   946ae:	vmovdqa -0x8c766(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   946b6:	vmovdqa -0x8be3e(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   946be:	vmovdqa -0x8c686(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   946c6:	vmovdqa -0x8c3ce(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   946ce:	vmovdqa -0x8bbf6(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   946d6:	vmovdqa -0x8bf1e(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   946de:	vmovdqa -0x8bac6(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   946e6:	vmovdqa -0x8b77e(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   946ee:	jmp    93f17 <sessions::fast::parse_events_avx2+0x2a97>
   946f3:	mov    %ecx,%edx
   946f5:	add    $0xfffffffffffffff8,%rcx
   946f9:	lea    0x0(,%rcx,8),%esi
   94700:	xor    %eax,%eax
   94702:	cmp    $0x10,%edx
   94705:	shrx   %rsi,%r9,%rdx
   9470a:	cmovae %rax,%rdx
   9470e:	mov    %ecx,%esi
   94710:	neg    %sil
   94713:	shl    $0x3,%sil
   94717:	shlx   %rsi,(%rbx),%rsi
   9471c:	or     %rsi,%rdx
   9471f:	xor    %r9,%rdx
   94722:	lea    (%rdx,%r8,1),%rdi
   94726:	or     %rsi,%rdi
   94729:	movabs $0x8080808080808080,%rsi
   94733:	test   %rsi,%rdi
   94736:	je     94740 <sessions::fast::parse_events_avx2+0x32c0>
   94738:	mov    $0xffffffff,%r15d
   9473e:	jmp    94765 <sessions::fast::parse_events_avx2+0x32e5>
   94740:	mov    %rsi,%rdi
   94743:	mov    (%rbx,%rcx,1),%rax
   94747:	mov    %rax,%rcx
   9474a:	xor    %r9,%rcx
   9474d:	lea    (%rcx,%r8,1),%rsi
   94751:	or     %rax,%rsi
   94754:	test   %rdi,%rsi
   94757:	je     94be6 <sessions::fast::parse_events_avx2+0x3766>
   9475d:	mov    $0xffffffff,%r15d
   94763:	xor    %eax,%eax
   94765:	movabs $0x7fffffffffffffff,%r10
   9476f:	xor    %r9d,%r9d
   94772:	incq   0xe0(%rsp)
   9477a:	mov    0x128(%rsp),%r8
   94782:	mov    %r8,%rcx
   94785:	movabs $0x9e3779b97f4a7c15,%rdx
   9478f:	imul   %rdx,%rcx
   94793:	mov    0x20(%rsp),%rdx
   94798:	movzbl 0x920(%rdx),%edx
   9479f:	xor    %esi,%esi
   947a1:	sub    %dl,%sil
   947a4:	shrx   %rsi,%rcx,%rbx
   947a9:	mov    0xd8(%rsp),%rdi
   947b1:	mov    0x68(%rdi),%rcx
   947b5:	movzbl (%rcx,%rbx,1),%esi
   947b9:	mov    %rbx,%r14
   947bc:	shl    $0x6,%r14
   947c0:	add    0x50(%rdi),%r14
   947c4:	lea    0x1(%rsi),%rdx
   947c8:	shl    $0x5,%esi
   947cb:	mov    %r8,(%rsi,%r14,1)
   947cf:	mov    %rax,0x8(%rsi,%r14,1)
   947d4:	mov    %r10,0x10(%rsi,%r14,1)
   947d9:	mov    %r15d,0x18(%rsi,%r14,1)
   947de:	mov    %r9d,0x1c(%rsi,%r14,1)
   947e3:	cmp    $0x2,%rdx
   947e7:	jne    9484d <sessions::fast::parse_events_avx2+0x33cd>
   947e9:	movb   $0x0,(%rcx,%rbx,1)
   947ed:	mov    0x8(%rdi),%rax
   947f1:	mov    0x20(%rdi),%rdx
   947f5:	mov    (%rax,%rbx,8),%rcx
   947f9:	cmp    (%rdx,%rbx,8),%rcx
   947fd:	mov    0x48(%rsp),%r9
   94802:	je     95167 <sessions::fast::parse_events_avx2+0x3ce7>
   94808:	vmovaps (%r14),%xmm0
   9480d:	movntdq %xmm0,(%rcx)
   94811:	lea    0x10(%rcx),%rdx
   94815:	vmovaps 0x10(%r14),%xmm0
   9481b:	movntdq %xmm0,(%rdx)
   9481f:	lea    0x20(%rcx),%rdx
   94823:	vmovaps 0x20(%r14),%xmm0
   94829:	movntdq %xmm0,(%rdx)
   9482d:	add    $0x30,%rcx
   94831:	vmovdqa 0x30(%r14),%xmm0
   94837:	movntdq %xmm0,(%rcx)
   9483b:	addq   $0x40,(%rax,%rbx,8)
   94840:	mov    0xa0(%rsp),%r13
   94848:	jmp    93b18 <sessions::fast::parse_events_avx2+0x2698>
   9484d:	mov    %dl,(%rcx,%rbx,1)
   94850:	mov    0xa0(%rsp),%r13
   94858:	mov    0x78(%rsp),%rsi
   9485d:	mov    0x54(%rsp),%r8d
   94862:	mov    0x2c(%rsp),%r14d
   94867:	mov    0x48(%rsp),%r9
   9486c:	jmp    93b27 <sessions::fast::parse_events_avx2+0x26a7>
   94871:	movzbl 0x13(%rbx),%r14d
   94876:	cmp    $0x2b,%r14d
   9487a:	je     94886 <sessions::fast::parse_events_avx2+0x3406>
   9487c:	cmp    $0x2d,%r14d
   94880:	jne    94b5a <sessions::fast::parse_events_avx2+0x36da>
   94886:	mov    %rdi,0x40(%rsp)
   9488b:	mov    %r10d,0x8(%rsp)
   94890:	mov    %r9,0x30(%rsp)
   94895:	mov    (%rbx),%rdx
   94898:	mov    0x20(%rsp),%rcx
   9489d:	mov    0x8e0(%rcx),%rax
   948a4:	imul   %rdx,%rax
   948a8:	shr    $0x3c,%rax
   948ac:	cmp    %rdx,0x698(%rcx,%rax,8)
   948b4:	jne    953ae <sessions::fast::parse_events_avx2+0x3f2e>
   948ba:	mov    0x718(%rcx,%rax,8),%r11
   948c2:	mov    0x798(%rcx,%rax,8),%rsi
   948ca:	movzwl 0x8(%rbx),%r9d
   948cf:	xor    $0x3030,%r9
   948d6:	mov    0xb(%rbx),%rcx
   948da:	mov    %rcx,%rax
   948dd:	movabs $0x3030303030303030,%rdx
   948e7:	xor    %rdx,%rax
   948ea:	lea    0x7676(%r9),%edx
   948f1:	or     %r9d,%edx
   948f4:	and    $0x8080,%edx
   948fa:	movabs $0x7676767676767676,%rdi
   94904:	add    %rax,%rdi
   94907:	or     %rcx,%rdi
   9490a:	movabs $0x8080008080008080,%r8
   94914:	and    %r8,%rdi
   94917:	xor    %r8d,%r8d
   9491a:	cmpb   $0x54,0xa(%rbx)
   9491e:	setne  %r8b
   94922:	movabs $0xff0000ff0000,%r10
   9492c:	and    %r10,%rcx
   9492f:	or     %r8,%rcx
   94932:	or     %rdi,%rcx
   94935:	or     %rdx,%rcx
   94938:	movabs $0x3a00003a0000,%rdx
   94942:	cmp    %rdx,%rcx
   94945:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   9494b:	lea    (%rax,%rax,4),%rcx
   9494f:	shr    $0x8,%rax
   94953:	lea    (%rax,%rcx,2),%rcx
   94957:	mov    %rcx,%rax
   9495a:	shr    $0x30,%rax
   9495e:	movzbl %al,%edx
   94961:	xor    %eax,%eax
   94963:	cmp    $0x3b,%rdx
   94967:	ja     94bdb <sessions::fast::parse_events_avx2+0x375b>
   9496d:	mov    %ecx,%edi
   9496f:	shr    $0x18,%edi
   94972:	cmp    $0x3b,%edi
   94975:	ja     94bdb <sessions::fast::parse_events_avx2+0x375b>
   9497b:	movzbl %cl,%r8d
   9497f:	cmp    $0x17,%r8d
   94983:	ja     94bdb <sessions::fast::parse_events_avx2+0x375b>
   94989:	movzbl %r9b,%ecx
   9498d:	lea    (%rcx,%rcx,4),%rcx
   94991:	shr    $0x8,%r9d
   94995:	lea    (%r9,%rcx,2),%r9
   94999:	test   %r9,%r9
   9499c:	je     94bdb <sessions::fast::parse_events_avx2+0x375b>
   949a2:	cmp    %rsi,%r9
   949a5:	jg     94bdb <sessions::fast::parse_events_avx2+0x375b>
   949ab:	cmpb   $0x3a,0x16(%rbx)
   949af:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   949b5:	movzbl 0x14(%rbx),%esi
   949b9:	add    $0xd0,%sil
   949bd:	xor    %eax,%eax
   949bf:	cmp    $0x9,%sil
   949c3:	ja     94bdb <sessions::fast::parse_events_avx2+0x375b>
   949c9:	mov    %r11,0x80(%rsp)
   949d1:	movzbl 0x15(%rbx),%r11d
   949d6:	add    $0xd0,%r11b
   949da:	cmp    $0x9,%r11b
   949de:	ja     94bdb <sessions::fast::parse_events_avx2+0x375b>
   949e4:	movzbl 0x17(%rbx),%ecx
   949e8:	add    $0xd0,%cl
   949eb:	cmp    $0x9,%cl
   949ee:	ja     94bdb <sessions::fast::parse_events_avx2+0x375b>
   949f4:	movzbl 0x18(%rbx),%r10d
   949f9:	add    $0xd0,%r10b
   949fd:	cmp    $0x9,%r10b
   94a01:	ja     94bdb <sessions::fast::parse_events_avx2+0x375b>
   94a07:	movzbl %sil,%eax
   94a0b:	add    %eax,%eax
   94a0d:	lea    (%rax,%rax,4),%esi
   94a10:	add    %r11b,%sil
   94a13:	xor    %eax,%eax
   94a15:	cmp    $0x17,%sil
   94a19:	ja     94bdb <sessions::fast::parse_events_avx2+0x375b>
   94a1f:	movzbl %cl,%ecx
   94a22:	add    %ecx,%ecx
   94a24:	lea    (%rcx,%rcx,4),%ecx
   94a27:	add    %r10b,%cl
   94a2a:	cmp    $0x3b,%cl
   94a2d:	ja     94bdb <sessions::fast::parse_events_avx2+0x375b>
   94a33:	add    0x80(%rsp),%r9
   94a3b:	imul   $0x15180,%r9,%rax
   94a42:	imul   $0xe10,%r8,%r8
   94a49:	imul   $0x3c,%rdi,%rdi
   94a4d:	add    %rdx,%r8
   94a50:	add    %rdi,%r8
   94a53:	add    %rax,%r8
   94a56:	imul   $0x3e8,%r8,%rax
   94a5d:	add    $0xfffffffffad9a400,%rax
   94a63:	movzbl %cl,%ecx
   94a66:	movzbl %sil,%edx
   94a6a:	imul   $0x36ee80,%rdx,%rdx
   94a71:	imul   $0xea60,%rcx,%rcx
   94a78:	add    %rdx,%rcx
   94a7b:	mov    %rcx,%r8
   94a7e:	neg    %r8
   94a81:	cmp    $0x2b,%r14b
   94a85:	cmovne %rcx,%r8
   94a89:	add    %rax,%r8
   94a8c:	jmp    9466a <sessions::fast::parse_events_avx2+0x31ea>
   94a91:	lea    -0x1(%rcx),%edx
   94a94:	cmp    $0x10,%edx
   94a97:	jae    94b52 <sessions::fast::parse_events_avx2+0x36d2>
   94a9d:	mov    %r10d,0x8(%rsp)
   94aa2:	mov    %r9,%r10
   94aa5:	cmp    $0x9,%ecx
   94aa8:	movabs $0x7676767676767676,%r8
   94ab2:	movabs $0x3030303030303030,%r9
   94abc:	jae    94c6e <sessions::fast::parse_events_avx2+0x37ee>
   94ac2:	lea    0x0(,%rcx,8),%edx
   94ac9:	xor    %eax,%eax
   94acb:	cmp    $0x8,%rcx
   94acf:	shrx   %rdx,%r9,%rdx
   94ad4:	cmove  %rax,%rdx
   94ad8:	neg    %cl
   94ada:	shl    $0x3,%cl
   94add:	shlx   %rcx,(%rbx),%rcx
   94ae2:	or     %rcx,%rdx
   94ae5:	xor    %r9,%rdx
   94ae8:	lea    (%rdx,%r8,1),%rsi
   94aec:	or     %rcx,%rsi
   94aef:	movabs $0x8080808080808080,%rcx
   94af9:	test   %rcx,%rsi
   94afc:	jne    94bdb <sessions::fast::parse_events_avx2+0x375b>
   94b02:	mov    %rdi,0x40(%rsp)
   94b07:	lea    (%rdx,%rdx,4),%rax
   94b0b:	shr    $0x8,%rdx
   94b0f:	lea    (%rdx,%rax,2),%r8
   94b13:	mov    %r8,%rax
   94b16:	movabs $0xff000000ff,%rdx
   94b20:	and    %rdx,%rax
   94b23:	movabs $0xf424000000064,%rcx
   94b2d:	imul   %rcx,%rax
   94b31:	shr    $0x10,%r8
   94b35:	and    %rdx,%r8
   94b38:	movabs $0x271000000001,%rcx
   94b42:	imul   %rcx,%r8
   94b46:	add    %rax,%r8
   94b49:	shr    $0x20,%r8
   94b4d:	jmp    94d51 <sessions::fast::parse_events_avx2+0x38d1>
   94b52:	cmp    %esi,%eax
   94b54:	je     94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94b5a:	mov    %rdi,0x40(%rsp)
   94b5f:	xor    %edx,%edx
   94b61:	xor    %eax,%eax
   94b63:	xor    %esi,%esi
   94b65:	xor    %r8d,%r8d
   94b68:	nopl   0x0(%rax,%rax,1)
   94b70:	movzbl (%rbx,%rdx,1),%edi
   94b74:	add    $0xd0,%dil
   94b78:	cmp    $0x9,%dil
   94b7c:	ja     9515d <sessions::fast::parse_events_avx2+0x3cdd>
   94b82:	test   %dil,%dil
   94b85:	mov    %rbx,%r11
   94b88:	mov    %r8,%rbx
   94b8b:	setne  %r8b
   94b8f:	or     %r8b,%sil
   94b92:	movzbl %sil,%r8d
   94b96:	and    $0x1,%r8d
   94b9a:	add    %r8d,%eax
   94b9d:	lea    (%rbx,%rbx,4),%r8
   94ba1:	mov    %r11,%rbx
   94ba4:	movzbl %dil,%edi
   94ba8:	lea    (%rdi,%r8,2),%r8
   94bac:	inc    %rdx
   94baf:	cmp    %rdx,%rcx
   94bb2:	jne    94b70 <sessions::fast::parse_events_avx2+0x36f0>
   94bb4:	cmp    $0x14,%eax
   94bb7:	setb   %al
   94bba:	test   %r8,%r8
   94bbd:	setns  %cl
   94bc0:	and    %al,%cl
   94bc2:	cmp    $0x1,%cl
   94bc5:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94bc7:	mov    0x20(%rsp),%rdx
   94bcc:	cmp    %r8,0x8e8(%rdx)
   94bd3:	jle    94d6b <sessions::fast::parse_events_avx2+0x38eb>
   94bd9:	xor    %eax,%eax
   94bdb:	xor    %r9d,%r9d
   94bde:	mov    %r13,%r10
   94be1:	jmp    94772 <sessions::fast::parse_events_avx2+0x32f2>
   94be6:	lea    (%rdx,%rdx,4),%rax
   94bea:	shr    $0x8,%rdx
   94bee:	lea    (%rdx,%rax,2),%rax
   94bf2:	mov    %rax,%rdx
   94bf5:	movabs $0xff000000ff,%r8
   94bff:	and    %r8,%rdx
   94c02:	movabs $0xf424000000064,%rsi
   94c0c:	imul   %rsi,%rdx
   94c10:	shr    $0x10,%rax
   94c14:	and    %r8,%rax
   94c17:	movabs $0x271000000001,%rdi
   94c21:	imul   %rdi,%rax
   94c25:	add    %rdx,%rax
   94c28:	shr    $0x20,%rax
   94c2c:	lea    (%rcx,%rcx,4),%rdx
   94c30:	shr    $0x8,%rcx
   94c34:	lea    (%rcx,%rdx,2),%rcx
   94c38:	mov    %rcx,%rdx
   94c3b:	and    %r8,%rdx
   94c3e:	imul   %rsi,%rdx
   94c42:	shr    $0x10,%rcx
   94c46:	and    %r8,%rcx
   94c49:	imul   %rdi,%rcx
   94c4d:	add    %rdx,%rcx
   94c50:	shr    $0x20,%rcx
   94c54:	imul   $0x5f5e100,%rax,%rax
   94c5b:	add    %rcx,%rax
   94c5e:	mov    %r13,%r9
   94c61:	mov    0x8(%rsp),%r10d
   94c66:	mov    %rax,%r13
   94c69:	jmp    944af <sessions::fast::parse_events_avx2+0x302f>
   94c6e:	mov    %rdi,0x40(%rsp)
   94c73:	mov    %ecx,%edx
   94c75:	add    $0xfffffffffffffff8,%rcx
   94c79:	lea    0x0(,%rcx,8),%esi
   94c80:	xor    %eax,%eax
   94c82:	cmp    $0x10,%edx
   94c85:	shrx   %rsi,%r9,%rdx
   94c8a:	cmovae %rax,%rdx
   94c8e:	mov    %ecx,%esi
   94c90:	neg    %sil
   94c93:	shl    $0x3,%sil
   94c97:	shlx   %rsi,(%rbx),%rsi
   94c9c:	or     %rsi,%rdx
   94c9f:	xor    %r9,%rdx
   94ca2:	lea    (%rdx,%r8,1),%rdi
   94ca6:	or     %rsi,%rdi
   94ca9:	movabs $0x8080808080808080,%rsi
   94cb3:	test   %rsi,%rdi
   94cb6:	jne    94bdb <sessions::fast::parse_events_avx2+0x375b>
   94cbc:	mov    %rsi,%rdi
   94cbf:	mov    (%rbx,%rcx,1),%rax
   94cc3:	mov    %rax,%rcx
   94cc6:	xor    %r9,%rcx
   94cc9:	lea    (%rcx,%r8,1),%rsi
   94ccd:	or     %rax,%rsi
   94cd0:	test   %rdi,%rsi
   94cd3:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94cd9:	lea    (%rdx,%rdx,4),%rax
   94cdd:	shr    $0x8,%rdx
   94ce1:	lea    (%rdx,%rax,2),%rax
   94ce5:	mov    %rax,%rdx
   94ce8:	movabs $0xff000000ff,%r8
   94cf2:	and    %r8,%rdx
   94cf5:	movabs $0xf424000000064,%rsi
   94cff:	imul   %rsi,%rdx
   94d03:	shr    $0x10,%rax
   94d07:	and    %r8,%rax
   94d0a:	movabs $0x271000000001,%rdi
   94d14:	imul   %rdi,%rax
   94d18:	add    %rdx,%rax
   94d1b:	shr    $0x20,%rax
   94d1f:	lea    (%rcx,%rcx,4),%rdx
   94d23:	shr    $0x8,%rcx
   94d27:	lea    (%rcx,%rdx,2),%rcx
   94d2b:	mov    %rcx,%rdx
   94d2e:	and    %r8,%rdx
   94d31:	imul   %rsi,%rdx
   94d35:	shr    $0x10,%rcx
   94d39:	and    %r8,%rcx
   94d3c:	imul   %rdi,%rcx
   94d40:	add    %rdx,%rcx
   94d43:	shr    $0x20,%rcx
   94d47:	imul   $0x5f5e100,%rax,%r8
   94d4e:	add    %rcx,%r8
   94d51:	mov    %r10,%r9
   94d54:	mov    0x8(%rsp),%r10d
   94d59:	mov    0x20(%rsp),%rdx
   94d5e:	cmp    %r8,0x8e8(%rdx)
   94d65:	jg     94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94d6b:	xor    %eax,%eax
   94d6d:	cmp    %r8,%r13
   94d70:	setns  %al
   94d73:	movabs $0x7fffffffffffffff,%rcx
   94d7d:	add    %rcx,%rax
   94d80:	mov    %r13,%rcx
   94d83:	sub    %r8,%rcx
   94d86:	cmovo  %rax,%rcx
   94d8a:	xor    %eax,%eax
   94d8c:	cmp    0x8f0(%rdx),%r8
   94d93:	jge    94bdb <sessions::fast::parse_events_avx2+0x375b>
   94d99:	cmp    $0x5265c00,%rcx
   94da0:	jg     94bdb <sessions::fast::parse_events_avx2+0x375b>
   94da6:	mov    0xa8(%rsp),%rcx
   94dae:	mov    0x38(%rsp),%eax
   94db2:	sub    %eax,%ecx
   94db4:	mov    %eax,%eax
   94db6:	cmp    $0x8,%ecx
   94db9:	je     94f23 <sessions::fast::parse_events_avx2+0x3aa3>
   94dbf:	cmp    $0x4,%ecx
   94dc2:	mov    0x1c(%rsp),%edx
   94dc6:	mov    0x40(%rsp),%rsi
   94dcb:	mov    0x60(%rsp),%rdi
   94dd0:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94dd6:	mov    0x10(%rsp),%rcx
   94ddb:	movzbl (%rcx,%rax,1),%ecx
   94ddf:	cmp    $0x63,%ecx
   94de2:	je     95134 <sessions::fast::parse_events_avx2+0x3cb4>
   94de8:	cmp    $0x76,%ecx
   94deb:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94df1:	mov    0x10(%rsp),%rcx
   94df6:	cmpb   $0x69,0x1(%rcx,%rax,1)
   94dfb:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94e01:	cmpb   $0x65,0x2(%rcx,%rax,1)
   94e06:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94e0c:	xor    %r9d,%r9d
   94e0f:	cmpb   $0x77,0x3(%rcx,%rax,1)
   94e14:	jne    9515d <sessions::fast::parse_events_avx2+0x3cdd>
   94e1a:	mov    %r9,%rbx
   94e1d:	sub    %edx,%esi
   94e1f:	cmp    $0xa,%esi
   94e22:	ja     9566b <sessions::fast::parse_events_avx2+0x41eb>
   94e28:	mov    0x10(%rsp),%rax
   94e2d:	vmovdqu (%rax,%rdi,1),%xmm1
   94e32:	vmovd  %esi,%xmm0
   94e36:	vpbroadcastb %xmm0,%xmm0
   94e3b:	vpcmpgtb %xmm8,%xmm0,%xmm0
   94e40:	vpaddb %xmm1,%xmm9,%xmm2
   94e44:	vpminub %xmm2,%xmm10,%xmm3
   94e48:	vpcmpeqb %xmm3,%xmm2,%xmm2
   94e4c:	vpaddb %xmm1,%xmm11,%xmm3
   94e50:	vpminub %xmm3,%xmm12,%xmm4
   94e54:	vpcmpeqb %xmm4,%xmm3,%xmm3
   94e58:	vpaddb %xmm1,%xmm13,%xmm4
   94e5c:	vpminub %xmm4,%xmm12,%xmm5
   94e60:	vpcmpeqb %xmm5,%xmm4,%xmm5
   94e64:	vpcmpeqb %xmm1,%xmm14,%xmm4
   94e68:	vpor   %xmm2,%xmm3,%xmm6
   94e6c:	vpor   %xmm5,%xmm4,%xmm7
   94e70:	vpor   %xmm6,%xmm7,%xmm6
   94e74:	vpandn %xmm0,%xmm6,%xmm6
   94e78:	vpmovmskb %xmm6,%eax
   94e7c:	test   %eax,%eax
   94e7e:	jne    9566b <sessions::fast::parse_events_avx2+0x41eb>
   94e84:	vpaddb %xmm1,%xmm15,%xmm6
   94e88:	vpand  %xmm6,%xmm5,%xmm5
   94e8c:	vpaddb -0x8bfd4(%rip),%xmm1,%xmm6        # 8ec0 <__abi_tag+0x8bc4>
   94e94:	vpand  %xmm6,%xmm3,%xmm3
   94e98:	vpaddb -0x8ca10(%rip),%xmm1,%xmm1        # 8490 <__abi_tag+0x8194>
   94ea0:	vpand  %xmm1,%xmm2,%xmm1
   94ea4:	vpor   %xmm3,%xmm1,%xmm1
   94ea8:	vpand  -0x8c620(%rip),%xmm4,%xmm2        # 8890 <__abi_tag+0x8594>
   94eb0:	vpor   %xmm2,%xmm5,%xmm2
   94eb4:	vpor   %xmm1,%xmm2,%xmm1
   94eb8:	vpand  %xmm1,%xmm0,%xmm0
   94ebc:	vpmaddubsw -0x8cf65(%rip),%xmm0,%xmm0        # 7f60 <__abi_tag+0x7c64>
   94ec5:	vpmaddwd -0x8c62d(%rip),%xmm0,%xmm0        # 88a0 <__abi_tag+0x85a4>
   94ecd:	vpextrd $0x1,%xmm0,%ecx
   94ed3:	vmovd  %xmm0,%edx
   94ed7:	vpextrd $0x2,%xmm0,%eax
   94edd:	shl    $0x24,%rdx
   94ee1:	shl    $0xc,%rcx
   94ee5:	or     %rdx,%rcx
   94ee8:	shr    $0xc,%eax
   94eeb:	or     %rcx,%rax
   94eee:	mov    0x20(%rsp),%rcx
   94ef3:	sub    0x8f8(%rcx),%r8d
   94efa:	mov    %r8d,%r15d
   94efd:	vpbroadcastb -0x8b800(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   94f06:	vpbroadcastb -0x8b808(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   94f0f:	vpbroadcastb -0x8b810(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   94f18:	mov    %r13,%r10
   94f1b:	mov    %rbx,%r9
   94f1e:	jmp    94772 <sessions::fast::parse_events_avx2+0x32f2>
   94f23:	mov    0x10(%rsp),%rcx
   94f28:	cmpb   $0x70,(%rcx,%rax,1)
   94f2c:	mov    0x40(%rsp),%rdx
   94f31:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94f37:	cmpb   $0x75,0x1(%rcx,%rax,1)
   94f3c:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94f42:	cmpb   $0x72,0x2(%rcx,%rax,1)
   94f47:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94f4d:	cmpb   $0x63,0x3(%rcx,%rax,1)
   94f52:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94f58:	cmpb   $0x68,0x4(%rcx,%rax,1)
   94f5d:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94f63:	cmpb   $0x61,0x5(%rcx,%rax,1)
   94f68:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94f6e:	cmpb   $0x73,0x6(%rcx,%rax,1)
   94f73:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   94f79:	mov    %r13,%rbx
   94f7c:	cmpb   $0x65,0x7(%rcx,%rax,1)
   94f81:	jne    95551 <sessions::fast::parse_events_avx2+0x40d1>
   94f87:	mov    %r8,0x38(%rsp)
   94f8c:	mov    %rdx,0x40(%rsp)
   94f91:	mov    %r9,%r13
   94f94:	mov    %r10d,%edi
   94f97:	add    %rcx,%rdi
   94f9a:	mov    0x118(%rsp),%rsi
   94fa2:	sub    %r10d,%esi
   94fa5:	vzeroupper
   94fa8:	call   9ce00 <sessions::events::parse_price>
   94fad:	test   $0x1,%al
   94faf:	je     9555e <sessions::fast::parse_events_avx2+0x40de>
   94fb5:	test   %edx,%edx
   94fb7:	vmovdqa -0x8c04f(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   94fbf:	vmovdqa -0x8c3a7(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   94fc7:	vmovdqa -0x8c80f(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   94fcf:	vmovdqa -0x8c4f7(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   94fd7:	vmovdqa -0x8ccdf(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   94fdf:	vmovdqa -0x8cfa7(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   94fe7:	vmovdqa -0x8c76f(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   94fef:	je     955c6 <sessions::fast::parse_events_avx2+0x4146>
   94ff5:	movabs $0x9e3779b97f4a7c15,%r14
   94fff:	mov    %edx,%r12d
   95002:	mov    %r13,%rsi
   95005:	sub    0x50(%rsp),%esi
   95009:	cmp    $0xa,%esi
   9500c:	mov    0x10(%rsp),%rcx
   95011:	ja     956c3 <sessions::fast::parse_events_avx2+0x4243>
   95017:	mov    0xe8(%rsp),%rax
   9501f:	vmovdqu (%rcx,%rax,1),%xmm1
   95024:	vmovd  %esi,%xmm0
   95028:	vpbroadcastb %xmm0,%xmm0
   9502d:	vpcmpgtb %xmm8,%xmm0,%xmm0
   95032:	vpaddb %xmm1,%xmm9,%xmm2
   95036:	vpminub %xmm2,%xmm10,%xmm3
   9503a:	vpcmpeqb %xmm3,%xmm2,%xmm2
   9503e:	vpaddb %xmm1,%xmm11,%xmm3
   95042:	vpminub %xmm3,%xmm12,%xmm4
   95046:	vpcmpeqb %xmm4,%xmm3,%xmm3
   9504a:	vpaddb %xmm1,%xmm13,%xmm4
   9504e:	vpminub %xmm4,%xmm12,%xmm5
   95052:	vpcmpeqb %xmm5,%xmm4,%xmm5
   95056:	vpcmpeqb %xmm1,%xmm14,%xmm4
   9505a:	vpor   %xmm2,%xmm3,%xmm6
   9505e:	vpor   %xmm5,%xmm4,%xmm7
   95062:	vpor   %xmm6,%xmm7,%xmm6
   95066:	vpandn %xmm0,%xmm6,%xmm6
   9506a:	vpmovmskb %xmm6,%eax
   9506e:	test   %eax,%eax
   95070:	jne    956c3 <sessions::fast::parse_events_avx2+0x4243>
   95076:	vpaddb -0x8d12e(%rip),%xmm1,%xmm6        # 7f50 <__abi_tag+0x7c54>
   9507e:	vpand  %xmm6,%xmm5,%xmm5
   95082:	vpaddb -0x8c1ca(%rip),%xmm1,%xmm6        # 8ec0 <__abi_tag+0x8bc4>
   9508a:	vpand  %xmm6,%xmm3,%xmm3
   9508e:	vpaddb -0x8cc06(%rip),%xmm1,%xmm1        # 8490 <__abi_tag+0x8194>
   95096:	vpand  %xmm1,%xmm2,%xmm1
   9509a:	vpor   %xmm3,%xmm1,%xmm1
   9509e:	vpand  -0x8c816(%rip),%xmm4,%xmm2        # 8890 <__abi_tag+0x8594>
   950a6:	vpor   %xmm2,%xmm5,%xmm2
   950aa:	vpor   %xmm1,%xmm2,%xmm1
   950ae:	vpand  %xmm1,%xmm0,%xmm0
   950b2:	vpmaddubsw -0x8d15b(%rip),%xmm0,%xmm0        # 7f60 <__abi_tag+0x7c64>
   950bb:	vpmaddwd -0x8c823(%rip),%xmm0,%xmm0        # 88a0 <__abi_tag+0x85a4>
   950c3:	vpextrd $0x1,%xmm0,%eax
   950c9:	vmovd  %xmm0,%ecx
   950cd:	vpextrd $0x2,%xmm0,%edx
   950d3:	shl    $0x24,%rcx
   950d7:	shl    $0xc,%rax
   950db:	or     %rcx,%rax
   950de:	shr    $0xc,%edx
   950e1:	or     %rax,%rdx
   950e4:	mov    %rdx,%rcx
   950e7:	imul   %r14,%rcx
   950eb:	shr    $0x20,%rcx
   950ef:	mov    0x20(%rsp),%r8
   950f4:	mov    0x10(%r8),%rsi
   950f8:	mov    0x30(%r8),%rax
   950fc:	mov    %eax,%edi
   950fe:	and    %ecx,%edi
   95100:	cmp    %rsi,%rdi
   95103:	jae    957fc <sessions::fast::parse_events_avx2+0x437c>
   95109:	mov    0x8(%r8),%rcx
   9510d:	mov    (%rcx,%rdi,8),%r8
   95111:	cmp    %rdx,%r8
   95114:	je     955cb <sessions::fast::parse_events_avx2+0x414b>
   9511a:	cmp    $0xffffffffffffffff,%r8
   9511e:	je     955ea <sessions::fast::parse_events_avx2+0x416a>
   95124:	inc    %rdi
   95127:	and    %rax,%rdi
   9512a:	cmp    %rsi,%rdi
   9512d:	jb     9510d <sessions::fast::parse_events_avx2+0x3c8d>
   9512f:	jmp    957fc <sessions::fast::parse_events_avx2+0x437c>
   95134:	mov    0x10(%rsp),%rcx
   95139:	cmpb   $0x61,0x1(%rcx,%rax,1)
   9513e:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   95144:	cmpb   $0x72,0x2(%rcx,%rax,1)
   95149:	jne    94bd9 <sessions::fast::parse_events_avx2+0x3759>
   9514f:	xor    %r9d,%r9d
   95152:	cmpb   $0x74,0x3(%rcx,%rax,1)
   95157:	je     94e1a <sessions::fast::parse_events_avx2+0x399a>
   9515d:	xor    %eax,%eax
   9515f:	mov    %r13,%r10
   95162:	jmp    9476f <sessions::fast::parse_events_avx2+0x32ef>
   95167:	mov    0xf0(%rsp),%rsi
   9516f:	mov    %rbx,%rdx
   95172:	vzeroupper
   95175:	call   786f0 <<sessions::fast::sink::Sink<sessions::fast::EventRec>>::refill>
   9517a:	mov    0xd8(%rsp),%rdi
   95182:	vpbroadcastb -0x8ba83(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   9518b:	vpbroadcastb -0x8ba8d(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   95194:	vpbroadcastb -0x8ba97(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   9519d:	vmovdqa -0x8d255(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   951a5:	vmovdqa -0x8c92d(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   951ad:	vmovdqa -0x8d175(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   951b5:	vmovdqa -0x8cebd(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   951bd:	vmovdqa -0x8c6e5(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   951c5:	vmovdqa -0x8ca0d(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   951cd:	vmovdqa -0x8c5b5(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   951d5:	vmovdqa -0x8c26d(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   951dd:	mov    0x48(%rsp),%r9
   951e2:	mov    0x8(%rdi),%rax
   951e6:	mov    (%rax,%rbx,8),%rcx
   951ea:	jmp    94808 <sessions::fast::parse_events_avx2+0x3388>
   951ef:	lea    0x98(%rcx),%rsi
   951f6:	lea    0x88(%rsp),%rdi
   951fe:	vzeroupper
   95201:	call   726d0 <<sessions::fast::ts::Calendar>::month_slow>
   95206:	cmpb   $0x0,0x88(%rsp)
   9520e:	je     95339 <sessions::fast::parse_events_avx2+0x3eb9>
   95214:	mov    0x90(%rsp),%r11
   9521c:	mov    0x98(%rsp),%rdi
   95224:	vmovdqa -0x8c2bc(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   9522c:	vmovdqa -0x8c614(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   95234:	vmovdqa -0x8ca7c(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   9523c:	vmovdqa -0x8c764(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   95244:	vmovdqa -0x8cf4c(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   9524c:	vmovdqa -0x8d214(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   95254:	vmovdqa -0x8c9dc(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   9525c:	vmovdqa -0x8d314(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   95264:	vpbroadcastb -0x8bb67(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   9526d:	vpbroadcastb -0x8bb6f(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   95276:	vpbroadcastb -0x8bb77(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   9527f:	vmovdqa 0x60(%rsp),%xmm0
   95285:	jmp    9415c <sessions::fast::parse_events_avx2+0x2cdc>
   9528a:	add    $0x98,%rsi
   95291:	lea    0x88(%rsp),%rdi
   95299:	vzeroupper
   9529c:	call   726d0 <<sessions::fast::ts::Calendar>::month_slow>
   952a1:	cmpb   $0x0,0x88(%rsp)
   952a9:	je     95339 <sessions::fast::parse_events_avx2+0x3eb9>
   952af:	mov    0x90(%rsp),%rcx
   952b7:	mov    0x98(%rsp),%rdx
   952bf:	movabs $0x7676767676767676,%r9
   952c9:	movabs $0x3030303030303030,%r8
   952d3:	vmovdqa -0x8c36b(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   952db:	vmovdqa -0x8c6c3(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   952e3:	vmovdqa -0x8cb2b(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   952eb:	vmovdqa -0x8c813(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   952f3:	vmovdqa -0x8cffb(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   952fb:	vmovdqa -0x8d2c3(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   95303:	vmovdqa -0x8ca8b(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   9530b:	vmovdqa -0x8d3c3(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   95313:	vpbroadcastb -0x8bc16(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   9531c:	vpbroadcastb -0x8bc1e(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   95325:	vpbroadcastb -0x8bc26(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   9532e:	vmovdqa 0x60(%rsp),%xmm0
   95334:	jmp    93fce <sessions::fast::parse_events_avx2+0x2b4e>
   95339:	xor    %eax,%eax
   9533b:	mov    $0xffffffff,%r15d
   95341:	movabs $0x7fffffffffffffff,%r10
   9534b:	xor    %r9d,%r9d
   9534e:	vmovdqa -0x8c3e6(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   95356:	vmovdqa -0x8c73e(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   9535e:	vmovdqa -0x8cba6(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   95366:	vmovdqa -0x8c88e(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   9536e:	vmovdqa -0x8d076(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   95376:	vmovdqa -0x8d33e(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   9537e:	vmovdqa -0x8cb06(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   95386:	vmovdqa -0x8d43e(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   9538e:	vpbroadcastb -0x8bc91(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   95397:	vpbroadcastb -0x8bc99(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   953a0:	vpbroadcastb -0x8bca1(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   953a9:	jmp    94772 <sessions::fast::parse_events_avx2+0x32f2>
   953ae:	lea    0x98(%rcx),%rsi
   953b5:	lea    0x88(%rsp),%rdi
   953bd:	vzeroupper
   953c0:	call   726d0 <<sessions::fast::ts::Calendar>::month_slow>
   953c5:	cmpb   $0x0,0x88(%rsp)
   953cd:	je     954ec <sessions::fast::parse_events_avx2+0x406c>
   953d3:	mov    0x90(%rsp),%r11
   953db:	mov    0x98(%rsp),%rsi
   953e3:	vmovdqa -0x8c47b(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   953eb:	vmovdqa -0x8c7d3(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   953f3:	vmovdqa -0x8cc3b(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   953fb:	vmovdqa -0x8c923(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   95403:	vmovdqa -0x8d10b(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   9540b:	vmovdqa -0x8d3d3(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   95413:	vmovdqa -0x8cb9b(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   9541b:	vmovdqa -0x8d4d3(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   95423:	vpbroadcastb -0x8bd26(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   9542c:	vpbroadcastb -0x8bd2e(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   95435:	vpbroadcastb -0x8bd36(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   9543e:	jmp    948ca <sessions::fast::parse_events_avx2+0x344a>
   95443:	add    $0x98,%rsi
   9544a:	lea    0x88(%rsp),%rdi
   95452:	vzeroupper
   95455:	call   726d0 <<sessions::fast::ts::Calendar>::month_slow>
   9545a:	cmpb   $0x0,0x88(%rsp)
   95462:	je     954ec <sessions::fast::parse_events_avx2+0x406c>
   95468:	mov    0x90(%rsp),%rcx
   95470:	mov    0x98(%rsp),%rdx
   95478:	movabs $0x7676767676767676,%r9
   95482:	movabs $0x3030303030303030,%r8
   9548c:	vmovdqa -0x8c524(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   95494:	vmovdqa -0x8c87c(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   9549c:	vmovdqa -0x8cce4(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   954a4:	vmovdqa -0x8c9cc(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   954ac:	vmovdqa -0x8d1b4(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   954b4:	vmovdqa -0x8d47c(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   954bc:	vmovdqa -0x8cc44(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   954c4:	vmovdqa -0x8d57c(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   954cc:	vpbroadcastb -0x8bdcf(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   954d5:	vpbroadcastb -0x8bdd7(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   954de:	vpbroadcastb -0x8bddf(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   954e7:	jmp    9456f <sessions::fast::parse_events_avx2+0x30ef>
   954ec:	xor    %eax,%eax
   954ee:	xor    %r9d,%r9d
   954f1:	vmovdqa -0x8c589(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   954f9:	vmovdqa -0x8c8e1(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   95501:	vmovdqa -0x8cd49(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   95509:	vmovdqa -0x8ca31(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   95511:	vmovdqa -0x8d219(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   95519:	vmovdqa -0x8d4e1(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   95521:	vmovdqa -0x8cca9(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   95529:	vmovdqa -0x8d5e1(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   95531:	vpbroadcastb -0x8be34(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   9553a:	vpbroadcastb -0x8be3c(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   95543:	vpbroadcastb -0x8be44(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   9554c:	jmp    94bde <sessions::fast::parse_events_avx2+0x375e>
   95551:	xor    %eax,%eax
   95553:	xor    %r9d,%r9d
   95556:	mov    %rbx,%r10
   95559:	jmp    94772 <sessions::fast::parse_events_avx2+0x32f2>
   9555e:	xor    %eax,%eax
   95560:	xor    %r9d,%r9d
   95563:	vmovdqa -0x8c5fb(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   9556b:	vmovdqa -0x8c953(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   95573:	vmovdqa -0x8cdbb(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   9557b:	vmovdqa -0x8caa3(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   95583:	vmovdqa -0x8d28b(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   9558b:	vmovdqa -0x8d553(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   95593:	vmovdqa -0x8cd1b(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   9559b:	vmovdqa -0x8d653(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   955a3:	vpbroadcastb -0x8bea6(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   955ac:	vpbroadcastb -0x8beae(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   955b5:	vpbroadcastb -0x8beb6(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   955be:	mov    %rbx,%r10
   955c1:	jmp    94772 <sessions::fast::parse_events_avx2+0x32f2>
   955c6:	xor    %r9d,%r9d
   955c9:	jmp    9563f <sessions::fast::parse_events_avx2+0x41bf>
   955cb:	mov    0x20(%rsp),%rax
   955d0:	mov    0x28(%rax),%rsi
   955d4:	cmp    %rsi,%rdi
   955d7:	jae    95808 <sessions::fast::parse_events_avx2+0x4388>
   955dd:	mov    0x20(%rsp),%rax
   955e2:	mov    0x20(%rax),%rax
   955e6:	mov    (%rax,%rdi,4),%r9d
   955ea:	cmp    %rdx,%r8
   955ed:	je     955fb <sessions::fast::parse_events_avx2+0x417b>
   955ef:	mov    0x20(%rsp),%rax
   955f4:	mov    0x918(%rax),%r9d
   955fb:	shl    $0x18,%r9d
   955ff:	or     %r12d,%r9d
   95602:	mov    0x58(%rsp),%r12
   95607:	vmovdqa -0x8c69f(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   9560f:	vmovdqa -0x8c9f7(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   95617:	vmovdqa -0x8ce5f(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   9561f:	vmovdqa -0x8cb47(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   95627:	vmovdqa -0x8d32f(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   9562f:	vmovdqa -0x8d5f7(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   95637:	vmovdqa -0x8cdbf(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   9563f:	vmovdqa -0x8d6f7(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   95647:	mov    0x1c(%rsp),%edx
   9564b:	mov    %rbx,%r13
   9564e:	mov    0x40(%rsp),%rsi
   95653:	mov    0x60(%rsp),%rdi
   95658:	mov    0x38(%rsp),%r8
   9565d:	mov    %r9,%rbx
   95660:	sub    %edx,%esi
   95662:	cmp    $0xa,%esi
   95665:	jbe    94e28 <sessions::fast::parse_events_avx2+0x39a8>
   9566b:	add    0x10(%rsp),%rdi
   95670:	mov    %r8,%r14
   95673:	vzeroupper
   95676:	call   a11d0 <sessions::fast::keys::intern_exotic>
   9567b:	mov    %r14,%r8
   9567e:	vmovdqa -0x8d736(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   95686:	vmovdqa -0x8ce0e(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   9568e:	vmovdqa -0x8d656(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   95696:	vmovdqa -0x8d39e(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   9569e:	vmovdqa -0x8cbc6(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   956a6:	vmovdqa -0x8ceee(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   956ae:	vmovdqa -0x8ca96(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   956b6:	vmovdqa -0x8c74e(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   956be:	jmp    94eee <sessions::fast::parse_events_avx2+0x3a6e>
   956c3:	mov    0xe8(%rsp),%rdi
   956cb:	add    %rcx,%rdi
   956ce:	call   a18a0 <sessions::fast::keys::lookup_exotic>
   956d3:	cmp    $0x1,%rax
   956d7:	je     950e4 <sessions::fast::parse_events_avx2+0x3c64>
   956dd:	jmp    955ef <sessions::fast::parse_events_avx2+0x416f>
   956e2:	data16 data16 data16 data16 cs nopw 0x0(%rax,%rax,1)
   956f0:	mov    %r10d,(%r12,%rbp,4)
   956f4:	mov    0x48(%rsp),%r9
   956f9:	mov    %r11d,(%r9,%rbp,4)
   956fd:	mov    0xc0(%rsp),%rax
   95705:	mov    %edx,(%rax,%rbp,4)
   95708:	inc    %rbp
   9570b:	test   %rbp,%rbp
   9570e:	jne    93ac4 <sessions::fast::parse_events_avx2+0x2644>
   95714:	xor    %ebx,%ebx
   95716:	mov    0xc8(%rsp),%r14
   9571e:	mov    0x10(%rsp),%rdi
   95723:	mov    0x78(%rsp),%rax
   95728:	nopl   0x0(%rax,%rax,1)
   95730:	cmpb   $0xa,(%rdi,%rbx,1)
   95734:	je     95741 <sessions::fast::parse_events_avx2+0x42c1>
   95736:	inc    %rbx
   95739:	cmp    %rbx,%rax
   9573c:	jne    95730 <sessions::fast::parse_events_avx2+0x42b0>
   9573e:	mov    %rax,%rbx
   95741:	mov    %rbx,%rsi
   95744:	lea    0xf8(%rsp),%rdx
   9574c:	vzeroupper
   9574f:	call   3b4b0 <sessions::fast::scan::long_line::<7, sessions::fast::EventLines<sessions::fast::scan::Avx2>>>
   95754:	mov    0xb0(%rsp),%rax
   9575c:	add    %rbx,%rax
   9575f:	inc    %rax
   95762:	vmovdqa -0x8c7fa(%rip),%xmm8        # 8f70 <__abi_tag+0x8c74>
   9576a:	vmovdqa -0x8cb52(%rip),%xmm9        # 8c20 <__abi_tag+0x8924>
   95772:	vmovdqa -0x8cfba(%rip),%xmm10        # 87c0 <__abi_tag+0x84c4>
   9577a:	vmovdqa -0x8cca2(%rip),%xmm11        # 8ae0 <__abi_tag+0x87e4>
   95782:	vmovdqa -0x8d48a(%rip),%xmm12        # 8300 <__abi_tag+0x8004>
   9578a:	vmovdqa -0x8d752(%rip),%xmm13        # 8040 <__abi_tag+0x7d44>
   95792:	vmovdqa -0x8cf1a(%rip),%xmm14        # 8880 <__abi_tag+0x8584>
   9579a:	vmovdqa -0x8d852(%rip),%xmm15        # 7f50 <__abi_tag+0x7c54>
   957a2:	vpbroadcastb -0x8c0a5(%rip),%ymm4        # 9706 <__abi_tag+0x940a>
   957ab:	vpbroadcastb -0x8c0ad(%rip),%ymm5        # 9707 <__abi_tag+0x940b>
   957b4:	vpbroadcastb -0x8c0b5(%rip),%ymm6        # 9708 <__abi_tag+0x940c>
   957bd:	cmp    %r14,%rax
   957c0:	jb     937aa <sessions::fast::parse_events_avx2+0x232a>
   957c6:	mov    %r15,%rdi
   957c9:	vzeroupper
   957cc:	call   *0xe990e(%rip)        # 17f0e0 <free@GLIBC_2.2.5>
   957d2:	mov    0x110(%rsp),%rax
   957da:	add    $0x148,%rsp
   957e1:	pop    %rbx
   957e2:	pop    %r12
   957e4:	pop    %r13
   957e6:	pop    %r14
   957e8:	pop    %r15
   957ea:	pop    %rbp
   957eb:	vzeroupper
   957ee:	ret
   957ef:	mov    $0x1,%edi
   957f4:	mov    %rbx,%rsi
   957f7:	call   b2393 <alloc::raw_vec::handle_error>
   957fc:	lea    0xe5105(%rip),%rdx        # 17a908 <__frame_dummy_init_array_entry+0x978>
   95803:	call   b500b <core::panicking::panic_bounds_check>
   95808:	lea    0xe5111(%rip),%rdx        # 17a920 <__frame_dummy_init_array_entry+0x990>
   9580f:	call   b500b <core::panicking::panic_bounds_check>
   95814:	int3
   95815:	int3
   95816:	int3
   95817:	int3
   95818:	int3
   95819:	int3
   9581a:	int3
   9581b:	int3
   9581c:	int3
   9581d:	int3
   9581e:	int3
   9581f:	int3

