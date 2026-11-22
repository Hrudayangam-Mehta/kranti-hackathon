00000000000de9a0 <sessions::fast::parse_events_avx2>:
   de9a0:	push   %rbp
   de9a1:	push   %r15
   de9a3:	push   %r14
   de9a5:	push   %r13
   de9a7:	push   %r12
   de9a9:	push   %rbx
   de9aa:	sub    $0x538,%rsp
   de9b1:	mov    %rdx,%r15
   de9b4:	mov    %rsi,%r13
   de9b7:	mov    0x570(%rsp),%rax
   de9bf:	lea    (%rdx,%rsi,1),%r14
   de9c3:	mov    %rdi,0xe8(%rsp)
   de9cb:	mov    %rcx,0xf0(%rsp)
   de9d3:	mov    %r8,0xf8(%rsp)
   de9db:	mov    %r9,0x100(%rsp)
   de9e3:	mov    %rax,0x108(%rsp)
   de9eb:	lea    0x110(%rsp),%rdi
   de9f3:	xor    %ebx,%ebx
   de9f5:	mov    $0x408,%edx
   de9fa:	xor    %esi,%esi
   de9fc:	call   *0x1aac3e(%rip)        # 289640 <_GLOBAL_OFFSET_TABLE_+0x28>
   dea02:	mov    %r13,0x518(%rsp)
   dea0a:	mov    %r14,0x520(%rsp)
   dea12:	movq   $0x0,0x528(%rsp)
   dea1e:	movb   $0x0,0x530(%rsp)
   dea26:	mov    %r15,%rax
   dea29:	sub    $0xa0,%rax
   dea2f:	cmovae %rax,%rbx
   dea33:	inc    %rbx
   dea36:	cs nopw 0x0(%rax,%rax,1)
   dea40:	cmp    $0x1,%rbx
   dea44:	je     e2fee <sessions::fast::parse_events_avx2+0x464e>
   dea4a:	lea    -0x1(%rbx),%r14
   dea4e:	cmpb   $0xa,-0x2(%r13,%rbx,1)
   dea54:	mov    %r14,%rbx
   dea57:	jne    dea40 <sessions::fast::parse_events_avx2+0xa0>
   dea59:	mov    %r15,0xc8(%rsp)
   dea61:	test   %r14,%r14
   dea64:	je     e2ff3 <sessions::fast::parse_events_avx2+0x4653>
   dea6a:	vpbroadcastb -0xcdcad(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   dea73:	vpbroadcastb -0xcdcb5(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   dea7c:	vpbroadcastb -0xcdcbd(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   dea85:	xor    %ebp,%ebp
   dea87:	mov    %r13,0x80(%rsp)
   dea8f:	mov    %r14,0xd0(%rsp)
   dea97:	jmp    deac9 <sessions::fast::parse_events_avx2+0x129>
   dea99:	mov    %cl,(%rax,%rbp,1)
   dea9c:	nopl   0x0(%rax)
   deaa0:	mov    0x28(%rsp),%rbp
   deaa5:	mov    0x60(%rsp),%rcx
   deaaa:	add    %rcx,%rbp
   deaad:	inc    %rbp
   deab0:	mov    0xd0(%rsp),%r14
   deab8:	mov    0x80(%rsp),%r13
   deac0:	cmp    %r14,%rbp
   deac3:	jae    e2ff3 <sessions::fast::parse_events_avx2+0x4653>
   deac9:	vmovdqu 0x0(%r13,%rbp,1),%ymm3
   dead0:	vmovdqu 0x20(%r13,%rbp,1),%ymm2
   dead7:	vmovdqu 0x40(%r13,%rbp,1),%ymm1
   deade:	vmovdqu 0x60(%r13,%rbp,1),%ymm0
   deae5:	vpcmpeqb %ymm5,%ymm3,%ymm4
   deae9:	vpmovmskb %ymm4,%ecx
   deaed:	vpcmpeqb %ymm5,%ymm2,%ymm4
   deaf1:	vpmovmskb %ymm4,%eax
   deaf5:	shl    $0x20,%rax
   deaf9:	or     %rcx,%rax
   deafc:	vpcmpeqb %ymm5,%ymm1,%ymm4
   deb00:	vpmovmskb %ymm4,%ecx
   deb04:	vpcmpeqb %ymm5,%ymm0,%ymm4
   deb08:	vpmovmskb %ymm4,%r8d
   deb0c:	shl    $0x20,%r8
   deb10:	or     %rcx,%r8
   deb13:	tzcnt  %rax,%rdx
   deb18:	tzcnt  %r8,%rcx
   deb1d:	test   %rax,%rax
   deb20:	mov    $0x0,%esi
   deb25:	mov    %rcx,0x60(%rsp)
   deb2a:	cmove  %ecx,%esi
   deb2d:	mov    %rdx,0x10(%rsp)
   deb32:	add    %edx,%esi
   deb34:	test   %rax,%rax
   deb37:	mov    $0xffffffffffffffff,%rcx
   deb3e:	mov    %rsi,0x98(%rsp)
   deb46:	shlx   %rsi,%rcx,%rdi
   deb4b:	not    %rdi
   deb4e:	mov    $0x0,%ecx
   deb53:	cmove  %rdi,%rcx
   deb57:	vpcmpeqb %ymm6,%ymm3,%ymm4
   deb5b:	vpmovmskb %ymm4,%r9d
   deb5f:	vpcmpeqb %ymm6,%ymm2,%ymm4
   deb63:	vpmovmskb %ymm4,%esi
   deb67:	shl    $0x20,%rsi
   deb6b:	or     %r9,%rsi
   deb6e:	cmp    $0x1,%rax
   deb72:	mov    $0x0,%ebx
   deb77:	sbb    %rbx,%rbx
   deb7a:	or     %rdi,%rbx
   deb7d:	vpcmpeqb %ymm7,%ymm3,%ymm3
   deb81:	vpmovmskb %ymm3,%edx
   deb85:	vpcmpeqb %ymm7,%ymm2,%ymm2
   deb89:	mov    %rbx,%r14
   deb8c:	and    %rsi,%r14
   deb8f:	vpcmpeqb %ymm6,%ymm1,%ymm3
   deb93:	vpmovmskb %ymm3,%r9d
   deb97:	vpcmpeqb %ymm6,%ymm0,%ymm3
   deb9b:	vpmovmskb %ymm3,%edi
   deb9f:	shl    $0x20,%rdi
   deba3:	or     %r9,%rdi
   deba6:	vpcmpeqb %ymm7,%ymm1,%ymm1
   debaa:	vpmovmskb %ymm1,%r9d
   debae:	vpcmpeqb %ymm7,%ymm0,%ymm0
   debb2:	vpmovmskb %ymm0,%r10d
   debb6:	shl    $0x20,%r10
   debba:	or     %r9,%r10
   debbd:	mov    %rcx,%r15
   debc0:	and    %rdi,%r15
   debc3:	popcnt %r14,%r9
   debc8:	popcnt %r15,%r12
   debcd:	add    %r9d,%r12d
   debd0:	vpmovmskb %ymm2,%r11d
   debd4:	shl    $0x20,%r11
   debd8:	mov    %rdx,0x48(%rsp)
   debdd:	or     %rdx,%r11
   debe0:	mov    %rbp,0x28(%rsp)
   debe5:	add    %rbp,%r13
   debe8:	cmp    $0x6,%r12d
   debec:	jne    dee00 <sessions::fast::parse_events_avx2+0x460>
   debf2:	blsr   %r14,%r9
   debf7:	blsr   %r9,%r9
   debfc:	tzcnt  %r9,%r12
   dec01:	cmp    $0x3f,%r12d
   dec05:	ja     dee00 <sessions::fast::parse_events_avx2+0x460>
   dec0b:	cmp    %r12d,0x98(%rsp)
   dec13:	jbe    dee00 <sessions::fast::parse_events_avx2+0x460>
   dec19:	lea    0x1(%r12),%r9d
   dec1e:	mov    0x98(%rsp),%rbp
   dec26:	sub    %r9d,%ebp
   dec29:	cmp    $0x40,%ebp
   dec2c:	jae    dee00 <sessions::fast::parse_events_avx2+0x460>
   dec32:	mov    %r13,0xa8(%rsp)
   dec3a:	mov    %r12d,%eax
   dec3d:	and    $0x3f,%eax
   dec40:	mov    $0x1,%edx
   dec45:	shlx   %rax,%rdx,%rdx
   dec4a:	mov    $0xffffffffffffffff,%rsi
   dec51:	bzhi   %rax,%rsi,%rsi
   dec56:	bzhi   %rax,%r14,%r13
   dec5b:	shrx   %rax,%r14,%rdi
   dec60:	shr    $1,%rdi
   dec63:	mov    %eax,%r8d
   dec66:	xor    $0x3f,%rax
   dec6a:	shlx   %rax,%r15,%r15
   dec6f:	or     %rdi,%r15
   dec72:	and    %r10,%rcx
   dec75:	and    %r11,%rbx
   dec78:	mov    %r13,%r10
   dec7b:	shrx   %r8,%rbx,%rdi
   dec80:	shr    $1,%rdi
   dec83:	shlx   %rax,%rcx,%rax
   dec88:	or     %rdi,%rax
   dec8b:	or     %r13,%rdx
   dec8e:	and    %rsi,%rbx
   dec91:	lea    0x1(,%r13,2),%r13
   dec99:	and    %rbx,%r13
   dec9c:	mov    %rdx,%rcx
   dec9f:	shr    $1,%rcx
   deca2:	andn   %rcx,%rdx,%rcx
   deca7:	sub    %r13,%rdx
   decaa:	and    %rdx,%rcx
   decad:	mov    %rcx,%rdx
   decb0:	or     %r13,%rdx
   decb3:	xor    %rbx,%rdx
   decb6:	and    %r13,%rcx
   decb9:	or     %rdx,%rcx
   decbc:	mov    %r15,%rdx
   decbf:	mov    %rbp,0x60(%rsp)
   decc4:	bts    %rbp,%rdx
   decc8:	lea    0x1(,%r15,2),%rdi
   decd0:	and    %rax,%rdi
   decd3:	mov    %rdx,%rsi
   decd6:	shr    $1,%rsi
   decd9:	andn   %rsi,%rdx,%rsi
   decde:	sub    %rdi,%rdx
   dece1:	and    %rdx,%rsi
   dece4:	mov    %rsi,%rdx
   dece7:	or     %rdi,%rdx
   decea:	xor    %rax,%rdx
   deced:	and    %rdi,%rsi
   decf0:	or     %rcx,%rsi
   decf3:	or     %rdx,%rsi
   decf6:	jne    e1880 <sessions::fast::parse_events_avx2+0x2ee0>
   decfc:	tzcnt  %r10,%rdx
   ded01:	lea    (%rbx,%rbx,1),%ecx
   ded04:	and    $0x2,%ecx
   ded07:	mov    %edx,%ebp
   ded09:	sub    %ecx,%ebp
   ded0b:	je     e1880 <sessions::fast::parse_events_avx2+0x2ee0>
   ded11:	mov    %r10,0x88(%rsp)
   ded19:	mov    %rdi,0x68(%rsp)
   ded1e:	mov    %rdx,0x50(%rsp)
   ded23:	and    $0x1,%ebx
   ded26:	mov    0xa8(%rsp),%rcx
   ded2e:	lea    (%rcx,%rbx,1),%r14
   ded32:	mov    %r9d,%r11d
   ded35:	add    %rcx,%r11
   ded38:	mov    %r15,0x20(%rsp)
   ded3d:	tzcnt  %r15,%r15
   ded42:	mov    %eax,%ecx
   ded44:	and    $0x1,%ecx
   ded47:	mov    %rcx,0x48(%rsp)
   ded4c:	add    %eax,%eax
   ded4e:	and    $0x2,%eax
   ded51:	mov    %r15,%rsi
   ded54:	mov    0xe8(%rsp),%r9
   ded5c:	incq   0x528(%rsp)
   ded64:	sub    %rax,%rsi
   ded67:	mov    %esi,%eax
   ded69:	mov    %rax,0x10(%rsp)
   ded6e:	mov    0xf8(%rsp),%rdi
   ded76:	cmp    $0xc,%ebp
   ded79:	mov    %r11,0x38(%rsp)
   ded7e:	mov    %r15,0x8(%rsp)
   ded83:	jae    df227 <sessions::fast::parse_events_avx2+0x887>
   ded89:	mov    %rbp,%rax
   ded8c:	shl    $0x4,%rax
   ded90:	mov    (%r14),%r15
   ded93:	lea    -0xc4f62(%rip),%rdx        # 19e38 <sessions::fast::ids::MASKS>
   ded9a:	and    (%rax,%rdx,1),%r15
   ded9e:	mov    0x8(%r14),%rcx
   deda2:	and    0x8(%rax,%rdx,1),%rcx
   deda7:	shl    $0x38,%rbp
   dedab:	mov    %rbp,%r10
   dedae:	or     %rcx,%r10
   dedb1:	movabs $0xff00000000000000,%rax
   dedbb:	dec    %rax
   dedbe:	cmp    %rax,%r10
   dedc1:	movabs $0xe7037ed1a0b428db,%rcx
   dedcb:	ja     dfda5 <sessions::fast::parse_events_avx2+0x1405>
   dedd1:	mov    %r15,%rax
   dedd4:	movabs $0xa0761d6478bd642f,%rdx
   dedde:	xor    %rdx,%rax
   dede1:	mov    %r10,%rdx
   dede4:	xor    %rcx,%rdx
   dede7:	mulx   %rax,%rcx,%rax
   dedec:	xor    %rcx,%rax
   dedef:	jmp    dfda8 <sessions::fast::parse_events_avx2+0x1408>
   dedf4:	data16 data16 cs nopw 0x0(%rax,%rax,1)
   dee00:	or     %rax,%r8
   dee03:	je     e1384 <sessions::fast::parse_events_avx2+0x29e4>
   dee09:	mov    0x60(%rsp),%rcx
   dee0e:	add    $0x40,%rcx
   dee12:	test   %rax,%rax
   dee15:	cmovne 0x10(%rsp),%rcx
   dee1b:	xor    %r8d,%r8d
   dee1e:	mov    $0x1,%eax
   dee23:	shld   %cl,%rax,%r8
   dee27:	shlx   %rcx,%rax,%rbx
   dee2c:	test   $0x40,%cl
   dee2f:	cmovne %rbx,%r8
   dee33:	mov    $0x0,%eax
   dee38:	cmovne %rax,%rbx
   dee3c:	mov    %rbx,%r12
   dee3f:	add    $0xffffffffffffffff,%r12
   dee43:	mov    %r8,%r9
   dee46:	adc    $0xffffffffffffffff,%r9
   dee4a:	and    %r9,%rdi
   dee4d:	and    %r12,%rsi
   dee50:	and    %r10,%r9
   dee53:	and    %r11,%r12
   dee56:	or     %rdi,%r8
   dee59:	or     %rsi,%rbx
   dee5c:	mov    %rdi,%rdx
   dee5f:	shld   $0x1,%rsi,%rdx
   dee64:	lea    0x1(,%rsi,2),%rax
   dee6c:	and    %r9,%rdx
   dee6f:	and    %r12,%rax
   dee72:	mov    %rbx,%r10
   dee75:	sub    %rax,%r10
   dee78:	mov    %r8,%r11
   dee7b:	sbb    %rdx,%r11
   dee7e:	mov    %rcx,0x60(%rsp)
   dee83:	test   %rcx,%rcx
   dee86:	je     deaa0 <sessions::fast::parse_events_avx2+0x100>
   dee8c:	popcnt %rdi,%r14
   dee91:	popcnt %rsi,%r15
   dee96:	add    %r14,%r15
   dee99:	cmp    $0x6,%r15d
   dee9d:	jne    deaa0 <sessions::fast::parse_events_avx2+0x100>
   deea3:	mov    %r8,%r14
   deea6:	shld   $0x3f,%rbx,%r14
   deeab:	mov    %r8,%r15
   deeae:	shr    $1,%r15
   deeb1:	andn   %r15,%r8,%r8
   deeb6:	and    %r11,%r8
   deeb9:	andn   %r14,%rbx,%r11
   deebe:	and    %r10,%r11
   deec1:	mov    %r8,%r10
   deec4:	or     %rdx,%r10
   deec7:	mov    %r11,%rbx
   deeca:	or     %rax,%rbx
   deecd:	xor    %r9,%r10
   deed0:	xor    %r12,%rbx
   deed3:	and    %rdx,%r8
   deed6:	or     %r10,%r8
   deed9:	and    %rax,%r11
   deedc:	or     %rbx,%r11
   deedf:	or     %r8,%r11
   deee2:	jne    deaa0 <sessions::fast::parse_events_avx2+0x100>
   deee8:	tzcnt  %rsi,%rcx
   deeed:	tzcnt  %rdi,%r11
   deef2:	add    $0x40,%r11d
   deef6:	test   %rsi,%rsi
   deef9:	cmovne %ecx,%r11d
   deefd:	mov    %rsi,%r9
   def00:	add    $0xffffffffffffffff,%r9
   def04:	mov    %rdi,%r10
   def07:	adc    $0xffffffffffffffff,%r10
   def0b:	and    %rdi,%r10
   def0e:	and    %rsi,%r9
   def11:	mov    0x48(%rsp),%r12
   def16:	and    $0x1,%r12d
   def1a:	tzcnt  %r9,%rcx
   def1f:	tzcnt  %r10,%r14
   def24:	add    $0x40,%r14d
   def28:	test   %r9,%r9
   def2b:	cmovne %ecx,%r14d
   def2f:	lea    0x1(%r11),%ecx
   def33:	mov    %r9,%rsi
   def36:	add    $0xffffffffffffffff,%rsi
   def3a:	mov    %r10,%r8
   def3d:	adc    $0xffffffffffffffff,%r8
   def41:	mov    %rax,%rdi
   def44:	shrd   %cl,%rdx,%rdi
   def48:	and    %r10,%r8
   def4b:	and    %r9,%rsi
   def4e:	shrx   %rcx,%rdx,%rbx
   def53:	test   $0x40,%cl
   def56:	cmove  %rdi,%rbx
   def5a:	tzcnt  %rsi,%rcx
   def5f:	tzcnt  %r8,%r15
   def64:	add    $0x40,%r15d
   def68:	test   %rsi,%rsi
   def6b:	cmovne %ecx,%r15d
   def6f:	mov    %r14,0x48(%rsp)
   def74:	lea    0x1(%r14),%ecx
   def78:	mov    %rsi,%rdi
   def7b:	add    $0xffffffffffffffff,%rdi
   def7f:	mov    %r8,%r9
   def82:	adc    $0xffffffffffffffff,%r9
   def86:	mov    %rax,%r10
   def89:	shrd   %cl,%rdx,%r10
   def8d:	and    %r8,%r9
   def90:	and    %rsi,%rdi
   def93:	shrx   %rcx,%rdx,%rsi
   def98:	test   $0x40,%cl
   def9b:	cmove  %r10,%rsi
   def9f:	mov    %rsi,0x40(%rsp)
   defa4:	tzcnt  %rdi,%rcx
   defa9:	tzcnt  %r9,%rbp
   defae:	add    $0x40,%rbp
   defb2:	test   %rdi,%rdi
   defb5:	cmovne %rcx,%rbp
   defb9:	mov    %r15,0x98(%rsp)
   defc1:	lea    0x1(%r15),%ecx
   defc5:	mov    %rdi,%rsi
   defc8:	add    $0xffffffffffffffff,%rsi
   defcc:	mov    %r9,%r8
   defcf:	adc    $0xffffffffffffffff,%r8
   defd3:	mov    %rax,%r10
   defd6:	shrd   %cl,%rdx,%r10
   defda:	and    %r9,%r8
   defdd:	and    %rdi,%rsi
   defe0:	shrx   %rcx,%rdx,%rdi
   defe5:	test   $0x40,%cl
   defe8:	cmove  %r10,%rdi
   defec:	mov    %rdi,0x10(%rsp)
   deff1:	tzcnt  %rsi,%rcx
   deff6:	tzcnt  %r8,%r14
   deffb:	add    $0x40,%r14
   defff:	test   %rsi,%rsi
   df002:	cmovne %rcx,%r14
   df006:	lea    0x1(%rbp),%ecx
   df009:	mov    %rsi,%rdi
   df00c:	add    $0xffffffffffffffff,%rdi
   df010:	mov    %r8,%r9
   df013:	adc    $0xffffffffffffffff,%r9
   df017:	mov    %rax,%r10
   df01a:	shrd   %cl,%rdx,%r10
   df01e:	and    %r8,%r9
   df021:	and    %rsi,%rdi
   df024:	test   $0x40,%cl
   df027:	shrx   %rcx,%rdx,%rcx
   df02c:	cmove  %r10,%rcx
   df030:	mov    %rcx,0x68(%rsp)
   df035:	tzcnt  %rdi,%rsi
   df03a:	tzcnt  %r9,%r8
   df03f:	add    $0x40,%r8d
   df043:	test   %rdi,%rdi
   df046:	lea    0x1(%r14),%ecx
   df04a:	cmovne %esi,%r8d
   df04e:	mov    %rax,%rsi
   df051:	shrd   %cl,%rdx,%rsi
   df055:	test   $0x40,%cl
   df058:	shrx   %rcx,%rdx,%rdi
   df05d:	cmove  %rsi,%rdi
   df061:	lea    0x1(%r8),%ecx
   df065:	shrd   %cl,%rdx,%rax
   df069:	shrx   %rcx,%rdx,%rdx
   df06e:	test   $0x40,%cl
   df071:	mov    %r12,%r15
   df074:	lea    (%r12,%r12,1),%ecx
   df078:	cmove  %rax,%rdx
   df07c:	mov    %r11d,%r12d
   df07f:	sub    %ecx,%r12d
   df082:	je     deaa0 <sessions::fast::parse_events_avx2+0x100>
   df088:	mov    %rdx,0x30(%rsp)
   df08d:	mov    %r14,0x18(%rsp)
   df092:	mov    %r8,0x70(%rsp)
   df097:	mov    %rbx,0x38(%rsp)
   df09c:	mov    %r11,0x8(%rsp)
   df0a1:	mov    0xe8(%rsp),%r9
   df0a9:	incq   0x528(%rsp)
   df0b1:	lea    (%r15,%r13,1),%r14
   df0b5:	mov    0xf8(%rsp),%r11
   df0bd:	cmp    $0xc,%r12d
   df0c1:	mov    %r9,0x50(%rsp)
   df0c6:	mov    %r13,0xa8(%rsp)
   df0ce:	mov    %rbp,0x88(%rsp)
   df0d6:	mov    %rdi,0x20(%rsp)
   df0db:	jae    df12a <sessions::fast::parse_events_avx2+0x78a>
   df0dd:	mov    %r12,%rax
   df0e0:	shl    $0x4,%rax
   df0e4:	mov    (%r14),%r10
   df0e7:	lea    -0xc52b6(%rip),%rdx        # 19e38 <sessions::fast::ids::MASKS>
   df0ee:	and    (%rax,%rdx,1),%r10
   df0f2:	mov    0x8(%r14),%rcx
   df0f6:	and    0x8(%rax,%rdx,1),%rcx
   df0fb:	shl    $0x38,%r12
   df0ff:	or     %rcx,%r12
   df102:	movabs $0xff00000000000000,%rax
   df10c:	dec    %rax
   df10f:	cmp    %rax,%r12
   df112:	movabs $0xe7037ed1a0b428db,%rcx
   df11c:	jbe    df49b <sessions::fast::parse_events_avx2+0xafb>
   df122:	mov    %r10,%rcx
   df125:	jmp    df57d <sessions::fast::parse_events_avx2+0xbdd>
   df12a:	cmp    $0x100,%r12d
   df131:	movabs $0xe7037ed1a0b428db,%r8
   df13b:	jae    df2ec <sessions::fast::parse_events_avx2+0x94c>
   df141:	cmp    %r14,0x518(%rsp)
   df149:	ja     df2ec <sessions::fast::parse_events_avx2+0x94c>
   df14f:	cmp    %r14,0x520(%rsp)
   df157:	jbe    df2ec <sessions::fast::parse_events_avx2+0x94c>
   df15d:	mov    %r12,%rdx
   df160:	movabs $0x589965cc75374cc3,%rax
   df16a:	imul   %rax,%rdx
   df16e:	movabs $0x8ebc6af09c88c6e3,%rax
   df178:	xor    %rax,%rdx
   df17b:	lea    -0x8(%r12),%rsi
   df180:	shr    $0x3,%rsi
   df184:	je     e0752 <sessions::fast::parse_events_avx2+0x1db2>
   df18a:	inc    %rsi
   df18d:	mov    %rsi,%rdi
   df190:	and    $0xfffffffffffffffe,%rdi
   df194:	mov    $0x8,%ecx
   df199:	nopl   0x0(%rax)
   df1a0:	mov    %rcx,%rax
   df1a3:	xor    -0x8(%r14,%rcx,1),%rdx
   df1a8:	mulx   %r8,%rcx,%rdx
   df1ad:	xor    %rcx,%rdx
   df1b0:	xor    (%r14,%rax,1),%rdx
   df1b4:	mulx   %r8,%rcx,%rdx
   df1b9:	xor    %rcx,%rdx
   df1bc:	lea    0x10(%rax),%rcx
   df1c0:	add    $0xfffffffffffffffe,%rdi
   df1c4:	jne    df1a0 <sessions::fast::parse_events_avx2+0x800>
   df1c6:	add    $0x8,%rax
   df1ca:	test   $0x1,%sil
   df1ce:	jne    e0759 <sessions::fast::parse_events_avx2+0x1db9>
   df1d4:	cmp    %r12,%rax
   df1d7:	je     df1f4 <sessions::fast::parse_events_avx2+0x854>
   df1d9:	mov    %r12d,%ecx
   df1dc:	neg    %ecx
   df1de:	shl    $0x3,%ecx
   df1e1:	and    $0x38,%cl
   df1e4:	mov    $0x40,%esi
   df1e9:	sub    %ecx,%esi
   df1eb:	bzhi   %rsi,(%r14,%rax,1),%rax
   df1f1:	xor    %rax,%rdx
   df1f4:	mov    0x10(%rsp),%rsi
   df1f9:	movabs $0xa0761d6478bd642f,%rax
   df203:	mulx   %rax,%rax,%r10
   df208:	xor    %rax,%r10
   df20b:	shl    $0x30,%r12
   df20f:	or     %r14,%r12
   df212:	movabs $0xff00000000000000,%rax
   df21c:	or     %rax,%r12
   df21f:	mov    %r10,%rcx
   df222:	jmp    df582 <sessions::fast::parse_events_avx2+0xbe2>
   df227:	cmp    $0x100,%ebp
   df22d:	movabs $0xe7037ed1a0b428db,%r8
   df237:	jae    df3b3 <sessions::fast::parse_events_avx2+0xa13>
   df23d:	cmp    %r14,0x518(%rsp)
   df245:	ja     df3b3 <sessions::fast::parse_events_avx2+0xa13>
   df24b:	cmp    %r14,0x520(%rsp)
   df253:	jbe    df3b3 <sessions::fast::parse_events_avx2+0xa13>
   df259:	mov    %rsi,0x58(%rsp)
   df25e:	mov    %rbp,%rdx
   df261:	movabs $0x589965cc75374cc3,%rax
   df26b:	imul   %rax,%rdx
   df26f:	movabs $0x8ebc6af09c88c6e3,%rax
   df279:	xor    %rax,%rdx
   df27c:	lea    -0x8(%rbp),%rsi
   df280:	shr    $0x3,%rsi
   df284:	je     e0776 <sessions::fast::parse_events_avx2+0x1dd6>
   df28a:	mov    %r9,%r10
   df28d:	inc    %rsi
   df290:	mov    %rsi,%r9
   df293:	and    $0xfffffffffffffffe,%r9
   df297:	mov    $0x8,%ecx
   df29c:	mov    0x10(%rsp),%rbx
   df2a1:	data16 data16 data16 data16 data16 cs nopw 0x0(%rax,%rax,1)
   df2b0:	mov    %rcx,%rax
   df2b3:	xor    -0x8(%r14,%rcx,1),%rdx
   df2b8:	mulx   %r8,%rcx,%rdx
   df2bd:	xor    %rcx,%rdx
   df2c0:	xor    (%r14,%rax,1),%rdx
   df2c4:	mulx   %r8,%rcx,%rdx
   df2c9:	xor    %rcx,%rdx
   df2cc:	lea    0x10(%rax),%rcx
   df2d0:	add    $0xfffffffffffffffe,%r9
   df2d4:	jne    df2b0 <sessions::fast::parse_events_avx2+0x910>
   df2d6:	add    $0x8,%rax
   df2da:	test   $0x1,%sil
   df2de:	mov    %r10,%r9
   df2e1:	jne    e0782 <sessions::fast::parse_events_avx2+0x1de2>
   df2e7:	jmp    e0791 <sessions::fast::parse_events_avx2+0x1df1>
   df2ec:	mov    %r12,%rdx
   df2ef:	movabs $0x589965cc75374cc3,%rax
   df2f9:	imul   %rax,%rdx
   df2fd:	movabs $0x8ebc6af09c88c6e3,%rax
   df307:	xor    %rax,%rdx
   df30a:	xor    %eax,%eax
   df30c:	nopl   0x0(%rax)
   df310:	mov    %rax,%rcx
   df313:	xor    (%r14,%rax,1),%rdx
   df317:	mulx   %r8,%rax,%rdx
   df31c:	xor    %rax,%rdx
   df31f:	lea    0x8(%rcx),%rax
   df323:	add    $0x10,%rcx
   df327:	cmp    %r12,%rcx
   df32a:	jbe    df310 <sessions::fast::parse_events_avx2+0x970>
   df32c:	cmp    %r12,%rax
   df32f:	je     df34c <sessions::fast::parse_events_avx2+0x9ac>
   df331:	mov    %r12d,%ecx
   df334:	neg    %ecx
   df336:	shl    $0x3,%ecx
   df339:	and    $0x38,%cl
   df33c:	mov    $0x40,%esi
   df341:	sub    %ecx,%esi
   df343:	bzhi   %rsi,(%r14,%rax,1),%rax
   df349:	xor    %rax,%rdx
   df34c:	movabs $0xa0761d6478bd642f,%rax
   df356:	mulx   %rax,%r13,%r10
   df35b:	lea    0xf(%r12),%rbx
   df360:	mov    %rbx,%rbp
   df363:	movabs $0x1fffffff0,%rax
   df36d:	and    %rax,%rbp
   df370:	or     $0x8,%rbp
   df374:	mov    (%r11),%rdx
   df377:	mov    0x8(%r11),%rax
   df37b:	sub    %rdx,%rax
   df37e:	cmp    %rbp,%rax
   df381:	mov    %r15,%r8
   df384:	jb     e1ba8 <sessions::fast::parse_events_avx2+0x3208>
   df38a:	shr    $0x4,%rbx
   df38e:	mov    %r12d,(%rdx)
   df391:	movl   $0x0,0x4(%rdx)
   df398:	lea    -0x1(%rbx),%ecx
   df39b:	mov    %ebx,%eax
   df39d:	and    $0x3,%eax
   df3a0:	cmp    $0x3,%ecx
   df3a3:	mov    %rdx,%r12
   df3a6:	jae    df4be <sessions::fast::parse_events_avx2+0xb1e>
   df3ac:	xor    %ecx,%ecx
   df3ae:	jmp    df514 <sessions::fast::parse_events_avx2+0xb74>
   df3b3:	mov    %rbp,%rdx
   df3b6:	movabs $0x589965cc75374cc3,%rax
   df3c0:	imul   %rax,%rdx
   df3c4:	movabs $0x8ebc6af09c88c6e3,%rax
   df3ce:	xor    %rax,%rdx
   df3d1:	xor    %eax,%eax
   df3d3:	data16 data16 data16 cs nopw 0x0(%rax,%rax,1)
   df3e0:	mov    %rax,%rcx
   df3e3:	xor    (%r14,%rax,1),%rdx
   df3e7:	mulx   %r8,%rax,%rdx
   df3ec:	xor    %rax,%rdx
   df3ef:	lea    0x8(%rcx),%rax
   df3f3:	add    $0x10,%rcx
   df3f7:	cmp    %rbp,%rcx
   df3fa:	jbe    df3e0 <sessions::fast::parse_events_avx2+0xa40>
   df3fc:	cmp    %rbp,%rax
   df3ff:	je     df421 <sessions::fast::parse_events_avx2+0xa81>
   df401:	mov    %ebp,%ecx
   df403:	neg    %ecx
   df405:	shl    $0x3,%ecx
   df408:	and    $0x38,%cl
   df40b:	mov    %rsi,%r8
   df40e:	mov    $0x40,%esi
   df413:	sub    %ecx,%esi
   df415:	bzhi   %rsi,(%r14,%rax,1),%rax
   df41b:	mov    %r8,%rsi
   df41e:	xor    %rax,%rdx
   df421:	movabs $0xa0761d6478bd642f,%rax
   df42b:	mulx   %rax,%rcx,%rax
   df430:	mov    %rcx,0x30(%rsp)
   df435:	mov    %rax,0x40(%rsp)
   df43a:	lea    0xf(%rbp),%r15
   df43e:	mov    %r15,%rcx
   df441:	movabs $0x1fffffff0,%rax
   df44b:	and    %rax,%rcx
   df44e:	or     $0x8,%rcx
   df452:	mov    (%rdi),%r10
   df455:	mov    0x8(%rdi),%rax
   df459:	sub    %r10,%rax
   df45c:	mov    %rcx,0x70(%rsp)
   df461:	cmp    %rcx,%rax
   df464:	jb     e1f21 <sessions::fast::parse_events_avx2+0x3581>
   df46a:	shr    $0x4,%r15
   df46e:	mov    %ebp,(%r10)
   df471:	movl   $0x0,0x4(%r10)
   df479:	lea    -0x1(%r15),%ecx
   df47d:	mov    %r15d,%eax
   df480:	and    $0x3,%eax
   df483:	cmp    $0x3,%ecx
   df486:	jae    dfcdc <sessions::fast::parse_events_avx2+0x133c>
   df48c:	xor    %ecx,%ecx
   df48e:	mov    0x80(%rsp),%r8
   df496:	jmp    dfd47 <sessions::fast::parse_events_avx2+0x13a7>
   df49b:	mov    %r10,%rax
   df49e:	movabs $0xa0761d6478bd642f,%rdx
   df4a8:	xor    %rdx,%rax
   df4ab:	mov    %r12,%rdx
   df4ae:	xor    %rcx,%rdx
   df4b1:	mulx   %rax,%rax,%rcx
   df4b6:	xor    %rax,%rcx
   df4b9:	jmp    df57d <sessions::fast::parse_events_avx2+0xbdd>
   df4be:	and    $0xfffffffc,%ebx
   df4c1:	lea    0x8(%r12),%rdx
   df4c6:	mov    $0x30,%esi
   df4cb:	xor    %ecx,%ecx
   df4cd:	nopl   (%rax)
   df4d0:	vmovups -0x30(%r14,%rsi,1),%xmm0
   df4d7:	vmovups %xmm0,-0x30(%rdx,%rsi,1)
   df4dd:	vmovups -0x20(%r14,%rsi,1),%xmm0
   df4e4:	vmovups %xmm0,-0x20(%rdx,%rsi,1)
   df4ea:	vmovups -0x10(%r14,%rsi,1),%xmm0
   df4f1:	vmovups %xmm0,-0x10(%rdx,%rsi,1)
   df4f7:	add    $0x4,%rcx
   df4fb:	vmovdqu (%r14,%rsi,1),%xmm0
   df501:	vmovdqu %xmm0,(%rdx,%rsi,1)
   df506:	add    $0x40,%rsi
   df50a:	cmp    %rcx,%rbx
   df50d:	jne    df4d0 <sessions::fast::parse_events_avx2+0xb30>
   df50f:	test   %rax,%rax
   df512:	je     df554 <sessions::fast::parse_events_avx2+0xbb4>
   df514:	shl    $0x4,%rcx
   df518:	lea    (%r12,%rcx,1),%rdx
   df51c:	add    $0x8,%rdx
   df520:	add    0x28(%rsp),%r8
   df525:	add    0x80(%rsp),%r8
   df52d:	add    %rcx,%r8
   df530:	shl    $0x4,%eax
   df533:	xor    %ecx,%ecx
   df535:	data16 cs nopw 0x0(%rax,%rax,1)
   df540:	vmovdqu (%r8,%rcx,1),%xmm0
   df546:	vmovdqu %xmm0,(%rdx,%rcx,1)
   df54b:	add    $0x10,%rcx
   df54f:	cmp    %rcx,%rax
   df552:	jne    df540 <sessions::fast::parse_events_avx2+0xba0>
   df554:	xor    %r13,%r10
   df557:	add    %r12,%rbp
   df55a:	mov    %rbp,(%r11)
   df55d:	movabs $0xff00000000000000,%rax
   df567:	or     %rax,%r12
   df56a:	mov    %r10,%rcx
   df56d:	mov    0xa8(%rsp),%r13
   df575:	mov    0x88(%rsp),%rbp
   df57d:	mov    0x10(%rsp),%rsi
   df582:	and    $0x1,%esi
   df585:	mov    0x98(%rsp),%rax
   df58d:	lea    (%rsi,%rax,1),%ebx
   df590:	inc    %ebx
   df592:	lea    (%rax,%rsi,2),%edx
   df595:	inc    %edx
   df597:	mov    %ebp,%eax
   df599:	sub    %edx,%eax
   df59b:	add    %r13,%rbx
   df59e:	movzbl 0x9a8(%r9),%esi
   df5a6:	xor    %edi,%edi
   df5a8:	sub    %sil,%dil
   df5ab:	shrx   %rdi,%rcx,%rbp
   df5b0:	cmp    $0x19,%rax
   df5b4:	je     df72a <sessions::fast::parse_events_avx2+0xd8a>
   df5ba:	cmp    $0x14,%eax
   df5bd:	jne    df946 <sessions::fast::parse_events_avx2+0xfa6>
   df5c3:	cmpb   $0x5a,0x13(%rbx)
   df5c7:	jne    dfa1e <sessions::fast::parse_events_avx2+0x107e>
   df5cd:	mov    (%rbx),%rdx
   df5d0:	mov    0x50(%rsp),%rsi
   df5d5:	mov    0x930(%rsi),%rcx
   df5dc:	imul   %rdx,%rcx
   df5e0:	shr    $0x3c,%rcx
   df5e4:	cmp    %rdx,0x6e8(%rsi,%rcx,8)
   df5ec:	jne    e2035 <sessions::fast::parse_events_avx2+0x3695>
   df5f2:	mov    %r11,%r15
   df5f5:	mov    %r10,%r14
   df5f8:	mov    0x768(%rsi,%rcx,8),%rax
   df600:	mov    0x7e8(%rsi,%rcx,8),%rcx
   df608:	movabs $0x7676767676767676,%r9
   df612:	movzwl 0x8(%rbx),%edx
   df616:	xor    $0x3030,%rdx
   df61d:	mov    0xb(%rbx),%rdi
   df621:	mov    %rdi,%rsi
   df624:	movabs $0x3030303030303030,%r8
   df62e:	xor    %r8,%rsi
   df631:	lea    0x7676(%rdx),%r8d
   df638:	or     %edx,%r8d
   df63b:	and    $0x8080,%r8d
   df642:	add    %rsi,%r9
   df645:	or     %rdi,%r9
   df648:	movabs $0x8080008080008080,%r10
   df652:	and    %r10,%r9
   df655:	xor    %r10d,%r10d
   df658:	cmpb   $0x54,0xa(%rbx)
   df65c:	setne  %r10b
   df660:	movabs $0xff0000ff0000,%r11
   df66a:	and    %r11,%rdi
   df66d:	or     %r10,%rdi
   df670:	or     %r9,%rdi
   df673:	or     %r8,%rdi
   df676:	mov    $0xffffffff,%r8d
   df67c:	mov    %r8,0x10(%rsp)
   df681:	movabs $0x3a00003a0000,%r8
   df68b:	cmp    %r8,%rdi
   df68e:	jne    e0a17 <sessions::fast::parse_events_avx2+0x2077>
   df694:	lea    (%rsi,%rsi,4),%rdi
   df698:	shr    $0x8,%rsi
   df69c:	lea    (%rsi,%rdi,2),%r8
   df6a0:	mov    %r8,%rsi
   df6a3:	shr    $0x30,%rsi
   df6a7:	movzbl %sil,%esi
   df6ab:	cmp    $0x3b,%rsi
   df6af:	mov    %r14,%r10
   df6b2:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df6b8:	mov    %r8d,%edi
   df6bb:	shr    $0x18,%edi
   df6be:	cmp    $0x3b,%edi
   df6c1:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df6c7:	movzbl %r8b,%r8d
   df6cb:	cmp    $0x17,%r8d
   df6cf:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df6d5:	movzbl %dl,%r9d
   df6d9:	lea    (%r9,%r9,4),%r9
   df6dd:	shr    $0x8,%edx
   df6e0:	lea    (%rdx,%r9,2),%rdx
   df6e4:	test   %rdx,%rdx
   df6e7:	je     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df6ed:	cmp    %rcx,%rdx
   df6f0:	jg     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df6f6:	mov    %r15,%r11
   df6f9:	add    %rax,%rdx
   df6fc:	imul   $0x15180,%rdx,%rax
   df703:	imul   $0xe10,%r8,%rcx
   df70a:	imul   $0x3c,%rdi,%rdx
   df70e:	add    %rsi,%rcx
   df711:	add    %rdx,%rcx
   df714:	add    %rax,%rcx
   df717:	imul   $0x3e8,%rcx,%r13
   df71e:	add    $0xfffffffffad9a400,%r13
   df725:	jmp    dfa93 <sessions::fast::parse_events_avx2+0x10f3>
   df72a:	movzbl 0x13(%rbx),%r14d
   df72f:	cmp    $0x2b,%r14d
   df733:	je     df73f <sessions::fast::parse_events_avx2+0xd9f>
   df735:	cmp    $0x2d,%r14d
   df739:	jne    dfa1e <sessions::fast::parse_events_avx2+0x107e>
   df73f:	mov    (%rbx),%rdx
   df742:	mov    0x50(%rsp),%rsi
   df747:	mov    0x930(%rsi),%rcx
   df74e:	imul   %rdx,%rcx
   df752:	shr    $0x3c,%rcx
   df756:	cmp    %rdx,0x6e8(%rsi,%rcx,8)
   df75e:	jne    e1f85 <sessions::fast::parse_events_avx2+0x35e5>
   df764:	mov    %r11,%r13
   df767:	mov    %r10,%r15
   df76a:	mov    0x768(%rsi,%rcx,8),%rax
   df772:	mov    0x7e8(%rsi,%rcx,8),%rdx
   df77a:	movzwl 0x8(%rbx),%r8d
   df77f:	xor    $0x3030,%r8
   df786:	mov    0xb(%rbx),%rsi
   df78a:	mov    %rsi,%rcx
   df78d:	movabs $0x3030303030303030,%rdi
   df797:	xor    %rdi,%rcx
   df79a:	lea    0x7676(%r8),%edi
   df7a1:	or     %r8d,%edi
   df7a4:	and    $0x8080,%edi
   df7aa:	movabs $0x7676767676767676,%r9
   df7b4:	add    %rcx,%r9
   df7b7:	or     %rsi,%r9
   df7ba:	movabs $0x8080008080008080,%r10
   df7c4:	and    %r10,%r9
   df7c7:	xor    %r10d,%r10d
   df7ca:	cmpb   $0x54,0xa(%rbx)
   df7ce:	setne  %r10b
   df7d2:	movabs $0xff0000ff0000,%r11
   df7dc:	and    %r11,%rsi
   df7df:	or     %r10,%rsi
   df7e2:	or     %r9,%rsi
   df7e5:	or     %rdi,%rsi
   df7e8:	mov    $0xffffffff,%edi
   df7ed:	mov    %rdi,0x10(%rsp)
   df7f2:	movabs $0x3a00003a0000,%rdi
   df7fc:	cmp    %rdi,%rsi
   df7ff:	jne    e2270 <sessions::fast::parse_events_avx2+0x38d0>
   df805:	lea    (%rcx,%rcx,4),%rsi
   df809:	shr    $0x8,%rcx
   df80d:	lea    (%rcx,%rsi,2),%rdi
   df811:	mov    %rdi,%rcx
   df814:	shr    $0x30,%rcx
   df818:	movzbl %cl,%ecx
   df81b:	cmp    $0x3b,%rcx
   df81f:	mov    %r15,%r10
   df822:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df828:	mov    %edi,%esi
   df82a:	shr    $0x18,%esi
   df82d:	cmp    $0x3b,%esi
   df830:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df836:	movzbl %dil,%edi
   df83a:	cmp    $0x17,%edi
   df83d:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df843:	movzbl %r8b,%r9d
   df847:	lea    (%r9,%r9,4),%r9
   df84b:	shr    $0x8,%r8d
   df84f:	lea    (%r8,%r9,2),%r8
   df853:	test   %r8,%r8
   df856:	je     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df85c:	cmp    %rdx,%r8
   df85f:	jg     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df865:	cmpb   $0x3a,0x16(%rbx)
   df869:	jne    e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df86f:	movzbl 0x14(%rbx),%edx
   df873:	add    $0xd0,%dl
   df876:	cmp    $0x9,%dl
   df879:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df87f:	movzbl 0x15(%rbx),%r9d
   df884:	add    $0xd0,%r9b
   df888:	cmp    $0x9,%r9b
   df88c:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df892:	movzbl 0x17(%rbx),%r11d
   df897:	add    $0xd0,%r11b
   df89b:	cmp    $0x9,%r11b
   df89f:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df8a5:	mov    %r10,%r15
   df8a8:	movzbl 0x18(%rbx),%r10d
   df8ad:	add    $0xd0,%r10b
   df8b1:	cmp    $0x9,%r10b
   df8b5:	ja     e2270 <sessions::fast::parse_events_avx2+0x38d0>
   df8bb:	movzbl %dl,%edx
   df8be:	add    %edx,%edx
   df8c0:	lea    (%rdx,%rdx,4),%edx
   df8c3:	add    %r9b,%dl
   df8c6:	cmp    $0x17,%dl
   df8c9:	ja     e2270 <sessions::fast::parse_events_avx2+0x38d0>
   df8cf:	movzbl %r11b,%r9d
   df8d3:	add    %r9d,%r9d
   df8d6:	lea    (%r9,%r9,4),%r9d
   df8da:	add    %r10b,%r9b
   df8dd:	cmp    $0x3b,%r9b
   df8e1:	mov    %r15,%r10
   df8e4:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df8ea:	mov    %r13,%r11
   df8ed:	add    %rax,%r8
   df8f0:	imul   $0x15180,%r8,%rax
   df8f7:	imul   $0xe10,%rdi,%rdi
   df8fe:	imul   $0x3c,%rsi,%rsi
   df902:	add    %rcx,%rdi
   df905:	add    %rsi,%rdi
   df908:	add    %rax,%rdi
   df90b:	imul   $0x3e8,%rdi,%rax
   df912:	add    $0xfffffffffad9a400,%rax
   df918:	movzbl %r9b,%ecx
   df91c:	movzbl %dl,%edx
   df91f:	imul   $0x36ee80,%rdx,%rdx
   df926:	imul   $0xea60,%rcx,%rcx
   df92d:	add    %rdx,%rcx
   df930:	mov    %rcx,%r13
   df933:	neg    %r13
   df936:	cmp    $0x2b,%r14b
   df93a:	cmovne %rcx,%r13
   df93e:	add    %rax,%r13
   df941:	jmp    dfa93 <sessions::fast::parse_events_avx2+0x10f3>
   df946:	lea    -0x1(%rax),%ecx
   df949:	cmp    $0x10,%ecx
   df94c:	jae    dfa07 <sessions::fast::parse_events_avx2+0x1067>
   df952:	cmp    $0x9,%eax
   df955:	movabs $0x8080808080808080,%rdi
   df95f:	movabs $0x7676767676767676,%r8
   df969:	movabs $0x3030303030303030,%r9
   df973:	jae    e0579 <sessions::fast::parse_events_avx2+0x1bd9>
   df979:	lea    0x0(,%rax,8),%ecx
   df980:	cmp    $0x8,%rax
   df984:	shrx   %rcx,%r9,%rdx
   df989:	mov    $0x0,%ecx
   df98e:	cmovne %rdx,%rcx
   df992:	neg    %al
   df994:	shl    $0x3,%al
   df997:	shlx   %rax,(%rbx),%rax
   df99c:	or     %rax,%rcx
   df99f:	xor    %r9,%rcx
   df9a2:	lea    (%rcx,%r8,1),%rdx
   df9a6:	or     %rax,%rdx
   df9a9:	mov    $0xffffffff,%eax
   df9ae:	mov    %rax,0x10(%rsp)
   df9b3:	test   %rdi,%rdx
   df9b6:	jne    e2273 <sessions::fast::parse_events_avx2+0x38d3>
   df9bc:	lea    (%rcx,%rcx,4),%rax
   df9c0:	shr    $0x8,%rcx
   df9c4:	lea    (%rcx,%rax,2),%r13
   df9c8:	mov    %r13,%rax
   df9cb:	movabs $0xff000000ff,%rcx
   df9d5:	and    %rcx,%rax
   df9d8:	movabs $0xf424000000064,%rdx
   df9e2:	imul   %rdx,%rax
   df9e6:	shr    $0x10,%r13
   df9ea:	and    %rcx,%r13
   df9ed:	movabs $0x271000000001,%rcx
   df9f7:	imul   %rcx,%r13
   df9fb:	add    %rax,%r13
   df9fe:	shr    $0x20,%r13
   dfa02:	jmp    dfa93 <sessions::fast::parse_events_avx2+0x10f3>
   dfa07:	mov    $0xffffffff,%ecx
   dfa0c:	mov    %rcx,0x10(%rsp)
   dfa11:	cmp    %edx,0x88(%rsp)
   dfa18:	je     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   dfa1e:	xor    %ecx,%ecx
   dfa20:	xor    %esi,%esi
   dfa22:	xor    %edx,%edx
   dfa24:	xor    %r13d,%r13d
   dfa27:	nopw   0x0(%rax,%rax,1)
   dfa30:	movzbl (%rbx,%rsi,1),%edi
   dfa34:	add    $0xd0,%dil
   dfa38:	cmp    $0x9,%dil
   dfa3c:	ja     dfccd <sessions::fast::parse_events_avx2+0x132d>
   dfa42:	test   %dil,%dil
   dfa45:	setne  %r8b
   dfa49:	or     %r8b,%cl
   dfa4c:	movzbl %cl,%r8d
   dfa50:	and    $0x1,%r8d
   dfa54:	add    %r8d,%edx
   dfa57:	lea    0x0(,%r13,4),%r8
   dfa5f:	add    %r13,%r8
   dfa62:	movzbl %dil,%edi
   dfa66:	lea    (%rdi,%r8,2),%r13
   dfa6a:	inc    %rsi
   dfa6d:	cmp    %rsi,%rax
   dfa70:	jne    dfa30 <sessions::fast::parse_events_avx2+0x1090>
   dfa72:	mov    $0xffffffff,%eax
   dfa77:	mov    %rax,0x10(%rsp)
   dfa7c:	cmp    $0x14,%edx
   dfa7f:	setb   %al
   dfa82:	test   %r13,%r13
   dfa85:	setns  %cl
   dfa88:	and    %al,%cl
   dfa8a:	cmp    $0x1,%cl
   dfa8d:	jne    e2273 <sessions::fast::parse_events_avx2+0x38d3>
   dfa93:	mov    %r13,%rax
   dfa96:	mov    0x50(%rsp),%r9
   dfa9b:	sub    0x950(%r9),%rax
   dfaa2:	mov    %rax,%rdx
   dfaa5:	shr    $0x3,%rdx
   dfaa9:	movabs $0x20c49ba5e353f7cf,%rcx
   dfab3:	mulx   %rcx,%rsi,%rsi
   dfab8:	movabs $0x3e7fffffc18,%rcx
   dfac2:	cmp    %rcx,%rax
   dfac5:	jae    dfad7 <sessions::fast::parse_events_avx2+0x1137>
   dfac7:	shr    $0x4,%rsi
   dfacb:	imul   $0x3e8,%rsi,%rcx
   dfad2:	cmp    %rcx,%rax
   dfad5:	je     dfae4 <sessions::fast::parse_events_avx2+0x1144>
   dfad7:	movb   $0x1,0x530(%rsp)
   dfadf:	mov    $0xffffffff,%esi
   dfae4:	mov    0x8(%rsp),%rax
   dfae9:	mov    0x38(%rsp),%r14
   dfaee:	mov    0x20(%rsp),%rdi
   dfaf3:	mov    0x48(%rsp),%rdx
   dfaf8:	and    $0x1,%r14d
   dfafc:	lea    (%rax,%r14,2),%eax
   dfb00:	inc    %eax
   dfb02:	mov    %edx,%ecx
   dfb04:	sub    %eax,%ecx
   dfb06:	mov    %rsi,0x10(%rsp)
   dfb0b:	je     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   dfb11:	and    $0x1,%edi
   dfb14:	mov    0x18(%rsp),%rax
   dfb19:	lea    (%rax,%rdi,2),%r8d
   dfb1d:	inc    %r8d
   dfb20:	cmp    %r8d,0x70(%rsp)
   dfb25:	je     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   dfb2b:	mov    %rcx,0x48(%rsp)
   dfb30:	mov    0x40(%rsp),%rax
   dfb35:	and    $0x1,%eax
   dfb38:	lea    (%rax,%rdx,1),%ebx
   dfb3b:	inc    %ebx
   dfb3d:	lea    (%rdx,%rax,2),%ecx
   dfb40:	inc    %ecx
   dfb42:	mov    0x98(%rsp),%rax
   dfb4a:	sub    %ecx,%eax
   dfb4c:	add    0xa8(%rsp),%rbx
   dfb54:	cmp    $0x19,%rax
   dfb58:	mov    %rdi,0x20(%rsp)
   dfb5d:	mov    %r8d,0x78(%rsp)
   dfb62:	je     e07eb <sessions::fast::parse_events_avx2+0x1e4b>
   dfb68:	cmp    $0x14,%eax
   dfb6b:	jne    e0a1f <sessions::fast::parse_events_avx2+0x207f>
   dfb71:	cmpb   $0x5a,0x13(%rbx)
   dfb75:	jne    e0dcb <sessions::fast::parse_events_avx2+0x242b>
   dfb7b:	mov    %r14,0x38(%rsp)
   dfb80:	mov    (%rbx),%rdx
   dfb83:	mov    0x930(%r9),%rcx
   dfb8a:	imul   %rdx,%rcx
   dfb8e:	shr    $0x3c,%rcx
   dfb92:	cmp    %rdx,0x6e8(%r9,%rcx,8)
   dfb9a:	jne    e2c4d <sessions::fast::parse_events_avx2+0x42ad>
   dfba0:	mov    %r11,%r15
   dfba3:	mov    %r10,%r14
   dfba6:	mov    0x768(%r9,%rcx,8),%rax
   dfbae:	mov    0x7e8(%r9,%rcx,8),%rcx
   dfbb6:	movabs $0x7676767676767676,%r9
   dfbc0:	movzwl 0x8(%rbx),%edx
   dfbc4:	xor    $0x3030,%rdx
   dfbcb:	mov    0xb(%rbx),%rdi
   dfbcf:	mov    %rdi,%rsi
   dfbd2:	movabs $0x3030303030303030,%r8
   dfbdc:	xor    %r8,%rsi
   dfbdf:	lea    0x7676(%rdx),%r8d
   dfbe6:	or     %edx,%r8d
   dfbe9:	and    $0x8080,%r8d
   dfbf0:	add    %rsi,%r9
   dfbf3:	or     %rdi,%r9
   dfbf6:	movabs $0x8080008080008080,%r10
   dfc00:	and    %r10,%r9
   dfc03:	xor    %r10d,%r10d
   dfc06:	cmpb   $0x54,0xa(%rbx)
   dfc0a:	setne  %r10b
   dfc0e:	movabs $0xff0000ff0000,%r11
   dfc18:	and    %r11,%rdi
   dfc1b:	or     %r10,%rdi
   dfc1e:	or     %r9,%rdi
   dfc21:	or     %r8,%rdi
   dfc24:	movabs $0x3a00003a0000,%r8
   dfc2e:	cmp    %r8,%rdi
   dfc31:	jne    e0a17 <sessions::fast::parse_events_avx2+0x2077>
   dfc37:	lea    (%rsi,%rsi,4),%rdi
   dfc3b:	shr    $0x8,%rsi
   dfc3f:	lea    (%rsi,%rdi,2),%r8
   dfc43:	mov    %r8,%rsi
   dfc46:	shr    $0x30,%rsi
   dfc4a:	movzbl %sil,%esi
   dfc4e:	cmp    $0x3b,%rsi
   dfc52:	mov    %r14,%r10
   dfc55:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   dfc5b:	mov    %r8d,%edi
   dfc5e:	shr    $0x18,%edi
   dfc61:	cmp    $0x3b,%edi
   dfc64:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   dfc6a:	movzbl %r8b,%r8d
   dfc6e:	cmp    $0x17,%r8d
   dfc72:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   dfc78:	movzbl %dl,%r9d
   dfc7c:	lea    (%r9,%r9,4),%r9
   dfc80:	shr    $0x8,%edx
   dfc83:	lea    (%rdx,%r9,2),%rdx
   dfc87:	test   %rdx,%rdx
   dfc8a:	je     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   dfc90:	cmp    %rcx,%rdx
   dfc93:	jg     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   dfc99:	add    %rax,%rdx
   dfc9c:	imul   $0x15180,%rdx,%rax
   dfca3:	imul   $0xe10,%r8,%rcx
   dfcaa:	imul   $0x3c,%rdi,%rdx
   dfcae:	add    %rsi,%rcx
   dfcb1:	add    %rdx,%rcx
   dfcb4:	add    %rax,%rcx
   dfcb7:	imul   $0x3e8,%rcx,%r14
   dfcbe:	add    $0xfffffffffad9a400,%r14
   dfcc5:	mov    %r15,%r11
   dfcc8:	jmp    e0f7e <sessions::fast::parse_events_avx2+0x25de>
   dfccd:	mov    $0xffffffff,%eax
   dfcd2:	mov    %rax,0x10(%rsp)
   dfcd7:	jmp    e2273 <sessions::fast::parse_events_avx2+0x38d3>
   dfcdc:	mov    %rsi,%rbp
   dfcdf:	and    $0xfffffffc,%r15d
   dfce3:	lea    0x8(%r10),%rdx
   dfce7:	mov    $0x30,%esi
   dfcec:	xor    %ecx,%ecx
   dfcee:	mov    0x80(%rsp),%r8
   dfcf6:	cs nopw 0x0(%rax,%rax,1)
   dfd00:	vmovups -0x30(%r14,%rsi,1),%xmm0
   dfd07:	vmovups %xmm0,-0x30(%rdx,%rsi,1)
   dfd0d:	vmovups -0x20(%r14,%rsi,1),%xmm0
   dfd14:	vmovups %xmm0,-0x20(%rdx,%rsi,1)
   dfd1a:	vmovups -0x10(%r14,%rsi,1),%xmm0
   dfd21:	vmovups %xmm0,-0x10(%rdx,%rsi,1)
   dfd27:	add    $0x4,%rcx
   dfd2b:	vmovdqu (%r14,%rsi,1),%xmm0
   dfd31:	vmovdqu %xmm0,(%rdx,%rsi,1)
   dfd36:	add    $0x40,%rsi
   dfd3a:	cmp    %rcx,%r15
   dfd3d:	jne    dfd00 <sessions::fast::parse_events_avx2+0x1360>
   dfd3f:	test   %rax,%rax
   dfd42:	mov    %rbp,%rsi
   dfd45:	je     dfd83 <sessions::fast::parse_events_avx2+0x13e3>
   dfd47:	shl    $0x4,%rcx
   dfd4b:	lea    (%r10,%rcx,1),%rdx
   dfd4f:	add    $0x8,%rdx
   dfd53:	add    0x28(%rsp),%rbx
   dfd58:	add    %r8,%rbx
   dfd5b:	add    %rcx,%rbx
   dfd5e:	shl    $0x4,%eax
   dfd61:	xor    %ecx,%ecx
   dfd63:	data16 data16 data16 cs nopw 0x0(%rax,%rax,1)
   dfd70:	vmovdqu (%rbx,%rcx,1),%xmm0
   dfd75:	vmovdqu %xmm0,(%rdx,%rcx,1)
   dfd7a:	add    $0x10,%rcx
   dfd7e:	cmp    %rcx,%rax
   dfd81:	jne    dfd70 <sessions::fast::parse_events_avx2+0x13d0>
   dfd83:	mov    0x40(%rsp),%r15
   dfd88:	xor    0x30(%rsp),%r15
   dfd8d:	mov    0x70(%rsp),%rax
   dfd92:	add    %r10,%rax
   dfd95:	mov    %rax,(%rdi)
   dfd98:	movabs $0xff00000000000000,%rax
   dfda2:	or     %rax,%r10
   dfda5:	mov    %r15,%rax
   dfda8:	mov    0x48(%rsp),%r14
   dfdad:	mov    0x10(%rsp),%rbx
   dfdb2:	add    %r11,%r14
   dfdb5:	movzbl 0x9a8(%r9),%ecx
   dfdbd:	xor    %edx,%edx
   dfdbf:	sub    %cl,%dl
   dfdc1:	shrx   %rdx,%rax,%r11
   dfdc6:	cmp    $0x19,%rsi
   dfdca:	je     dff50 <sessions::fast::parse_events_avx2+0x15b0>
   dfdd0:	cmp    $0x14,%esi
   dfdd3:	jne    e0184 <sessions::fast::parse_events_avx2+0x17e4>
   dfdd9:	cmpb   $0x5a,0x13(%r14)
   dfdde:	jne    e025c <sessions::fast::parse_events_avx2+0x18bc>
   dfde4:	mov    %r15,%rbp
   dfde7:	mov    %r14,%r15
   dfdea:	mov    (%r14),%rdx
   dfded:	mov    0x930(%r9),%rcx
   dfdf4:	imul   %rdx,%rcx
   dfdf8:	shr    $0x3c,%rcx
   dfdfc:	cmp    %rdx,0x6e8(%r9,%rcx,8)
   dfe04:	mov    %rdi,0x78(%rsp)
   dfe09:	mov    %r9,0x18(%rsp)
   dfe0e:	mov    %r11,%r14
   dfe11:	mov    %r10,%rbx
   dfe14:	jne    e210d <sessions::fast::parse_events_avx2+0x376d>
   dfe1a:	mov    0x768(%r9,%rcx,8),%rax
   dfe22:	mov    0x7e8(%r9,%rcx,8),%rcx
   dfe2a:	movzwl 0x8(%r15),%edx
   dfe2f:	xor    $0x3030,%rdx
   dfe36:	mov    0xb(%r15),%rdi
   dfe3a:	mov    %rdi,%rsi
   dfe3d:	movabs $0x3030303030303030,%r8
   dfe47:	xor    %r8,%rsi
   dfe4a:	lea    0x7676(%rdx),%r8d
   dfe51:	or     %edx,%r8d
   dfe54:	and    $0x8080,%r8d
   dfe5b:	movabs $0x7676767676767676,%r9
   dfe65:	add    %rsi,%r9
   dfe68:	or     %rdi,%r9
   dfe6b:	movabs $0x8080008080008080,%r10
   dfe75:	and    %r10,%r9
   dfe78:	xor    %r10d,%r10d
   dfe7b:	cmpb   $0x54,0xa(%r15)
   dfe80:	setne  %r10b
   dfe84:	movabs $0xff0000ff0000,%r11
   dfe8e:	and    %r11,%rdi
   dfe91:	or     %r10,%rdi
   dfe94:	or     %r9,%rdi
   dfe97:	or     %r8,%rdi
   dfe9a:	movabs $0x3a00003a0000,%r8
   dfea4:	cmp    %r8,%rdi
   dfea7:	jne    e073a <sessions::fast::parse_events_avx2+0x1d9a>
   dfead:	mov    $0xffffffff,%edi
   dfeb2:	mov    %rdi,0x10(%rsp)
   dfeb7:	lea    (%rsi,%rsi,4),%rdi
   dfebb:	shr    $0x8,%rsi
   dfebf:	lea    (%rsi,%rdi,2),%r8
   dfec3:	mov    %r8,%rsi
   dfec6:	shr    $0x30,%rsi
   dfeca:	movzbl %sil,%esi
   dfece:	cmp    $0x3b,%rsi
   dfed2:	mov    %rbx,%r10
   dfed5:	mov    %r14,%r11
   dfed8:	mov    %rbp,%r15
   dfedb:	ja     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   dfee1:	mov    %r8d,%edi
   dfee4:	shr    $0x18,%edi
   dfee7:	cmp    $0x3b,%edi
   dfeea:	ja     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   dfef0:	movzbl %r8b,%r8d
   dfef4:	cmp    $0x17,%r8d
   dfef8:	ja     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   dfefe:	movzbl %dl,%r9d
   dff02:	lea    (%r9,%r9,4),%r9
   dff06:	shr    $0x8,%edx
   dff09:	lea    (%rdx,%r9,2),%rdx
   dff0d:	test   %rdx,%rdx
   dff10:	je     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   dff16:	cmp    %rcx,%rdx
   dff19:	jg     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   dff1f:	add    %rax,%rdx
   dff22:	imul   $0x15180,%rdx,%rax
   dff29:	imul   $0xe10,%r8,%rcx
   dff30:	imul   $0x3c,%rdi,%rdx
   dff34:	add    %rsi,%rcx
   dff37:	add    %rdx,%rcx
   dff3a:	add    %rax,%rcx
   dff3d:	imul   $0x3e8,%rcx,%rbp
   dff44:	add    $0xfffffffffad9a400,%rbp
   dff4b:	jmp    e02de <sessions::fast::parse_events_avx2+0x193e>
   dff50:	movzbl 0x13(%r14),%ebx
   dff55:	cmp    $0x2b,%ebx
   dff58:	je     dff63 <sessions::fast::parse_events_avx2+0x15c3>
   dff5a:	cmp    $0x2d,%ebx
   dff5d:	jne    e025c <sessions::fast::parse_events_avx2+0x18bc>
   dff63:	mov    %r15,0x40(%rsp)
   dff68:	mov    %r14,%r15
   dff6b:	mov    (%r14),%rdx
   dff6e:	mov    0x930(%r9),%rcx
   dff75:	imul   %rdx,%rcx
   dff79:	shr    $0x3c,%rcx
   dff7d:	cmp    %rdx,0x6e8(%r9,%rcx,8)
   dff85:	mov    %rdi,0x78(%rsp)
   dff8a:	mov    %r9,0x18(%rsp)
   dff8f:	mov    %r11,%rbp
   dff92:	mov    %r10,%r14
   dff95:	jne    e1fe0 <sessions::fast::parse_events_avx2+0x3640>
   dff9b:	mov    0x768(%r9,%rcx,8),%rax
   dffa3:	mov    0x7e8(%r9,%rcx,8),%rdx
   dffab:	movzwl 0x8(%r15),%r8d
   dffb0:	xor    $0x3030,%r8
   dffb7:	mov    0xb(%r15),%rsi
   dffbb:	mov    %rsi,%rcx
   dffbe:	movabs $0x3030303030303030,%rdi
   dffc8:	xor    %rdi,%rcx
   dffcb:	lea    0x7676(%r8),%edi
   dffd2:	or     %r8d,%edi
   dffd5:	and    $0x8080,%edi
   dffdb:	movabs $0x7676767676767676,%r9
   dffe5:	add    %rcx,%r9
   dffe8:	or     %rsi,%r9
   dffeb:	movabs $0x8080008080008080,%r10
   dfff5:	and    %r10,%r9
   dfff8:	xor    %r10d,%r10d
   dfffb:	cmpb   $0x54,0xa(%r15)
   e0000:	setne  %r10b
   e0004:	movabs $0xff0000ff0000,%r11
   e000e:	and    %r11,%rsi
   e0011:	or     %r10,%rsi
   e0014:	or     %r9,%rsi
   e0017:	or     %rdi,%rsi
   e001a:	movabs $0x3a00003a0000,%rdi
   e0024:	cmp    %rdi,%rsi
   e0027:	jne    e055f <sessions::fast::parse_events_avx2+0x1bbf>
   e002d:	mov    $0xffffffff,%esi
   e0032:	mov    %rsi,0x10(%rsp)
   e0037:	lea    (%rcx,%rcx,4),%rsi
   e003b:	shr    $0x8,%rcx
   e003f:	lea    (%rcx,%rsi,2),%rdi
   e0043:	mov    %rdi,%rcx
   e0046:	shr    $0x30,%rcx
   e004a:	movzbl %cl,%ecx
   e004d:	cmp    $0x3b,%rcx
   e0051:	mov    %r14,%r10
   e0054:	mov    %rbp,%r11
   e0057:	ja     e17c5 <sessions::fast::parse_events_avx2+0x2e25>
   e005d:	mov    %edi,%esi
   e005f:	shr    $0x18,%esi
   e0062:	cmp    $0x3b,%esi
   e0065:	ja     e17c5 <sessions::fast::parse_events_avx2+0x2e25>
   e006b:	movzbl %dil,%edi
   e006f:	cmp    $0x17,%edi
   e0072:	ja     e17c5 <sessions::fast::parse_events_avx2+0x2e25>
   e0078:	movzbl %r8b,%r9d
   e007c:	lea    (%r9,%r9,4),%r9
   e0080:	shr    $0x8,%r8d
   e0084:	lea    (%r8,%r9,2),%r8
   e0088:	test   %r8,%r8
   e008b:	je     e17c5 <sessions::fast::parse_events_avx2+0x2e25>
   e0091:	cmp    %rdx,%r8
   e0094:	jg     e17c5 <sessions::fast::parse_events_avx2+0x2e25>
   e009a:	cmpb   $0x3a,0x16(%r15)
   e009f:	jne    e17c5 <sessions::fast::parse_events_avx2+0x2e25>
   e00a5:	movzbl 0x14(%r15),%edx
   e00aa:	add    $0xd0,%dl
   e00ad:	cmp    $0x9,%dl
   e00b0:	ja     e17c5 <sessions::fast::parse_events_avx2+0x2e25>
   e00b6:	movzbl 0x15(%r15),%r9d
   e00bb:	add    $0xd0,%r9b
   e00bf:	cmp    $0x9,%r9b
   e00c3:	ja     e17c5 <sessions::fast::parse_events_avx2+0x2e25>
   e00c9:	mov    %r11,%rbp
   e00cc:	movzbl 0x17(%r15),%r11d
   e00d1:	add    $0xd0,%r11b
   e00d5:	cmp    $0x9,%r11b
   e00d9:	ja     e056c <sessions::fast::parse_events_avx2+0x1bcc>
   e00df:	mov    %r10,%r14
   e00e2:	movzbl 0x18(%r15),%r10d
   e00e7:	add    $0xd0,%r10b
   e00eb:	cmp    $0x9,%r10b
   e00ef:	ja     e0569 <sessions::fast::parse_events_avx2+0x1bc9>
   e00f5:	movzbl %dl,%edx
   e00f8:	add    %edx,%edx
   e00fa:	lea    (%rdx,%rdx,4),%edx
   e00fd:	add    %r9b,%dl
   e0100:	cmp    $0x17,%dl
   e0103:	mov    0x40(%rsp),%r15
   e0108:	ja     e1298 <sessions::fast::parse_events_avx2+0x28f8>
   e010e:	movzbl %r11b,%r9d
   e0112:	add    %r9d,%r9d
   e0115:	lea    (%r9,%r9,4),%r9d
   e0119:	add    %r10b,%r9b
   e011c:	cmp    $0x3b,%r9b
   e0120:	mov    %r14,%r10
   e0123:	mov    %rbp,%r11
   e0126:	ja     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e012c:	add    %rax,%r8
   e012f:	imul   $0x15180,%r8,%rax
   e0136:	imul   $0xe10,%rdi,%rdi
   e013d:	imul   $0x3c,%rsi,%rsi
   e0141:	add    %rcx,%rdi
   e0144:	add    %rsi,%rdi
   e0147:	add    %rax,%rdi
   e014a:	imul   $0x3e8,%rdi,%rax
   e0151:	add    $0xfffffffffad9a400,%rax
   e0157:	movzbl %r9b,%ecx
   e015b:	movzbl %dl,%edx
   e015e:	imul   $0x36ee80,%rdx,%rdx
   e0165:	imul   $0xea60,%rcx,%rcx
   e016c:	add    %rdx,%rcx
   e016f:	mov    %rcx,%rbp
   e0172:	neg    %rbp
   e0175:	cmp    $0x2b,%bl
   e0178:	cmovne %rcx,%rbp
   e017c:	add    %rax,%rbp
   e017f:	jmp    e02de <sessions::fast::parse_events_avx2+0x193e>
   e0184:	lea    -0x1(%rbx),%rax
   e0188:	cmp    $0x10,%rax
   e018c:	jae    e0253 <sessions::fast::parse_events_avx2+0x18b3>
   e0192:	mov    %r9,0x18(%rsp)
   e0197:	mov    %rdi,0x78(%rsp)
   e019c:	cmp    $0x9,%ebx
   e019f:	movabs $0x8080808080808080,%rdi
   e01a9:	movabs $0x7676767676767676,%r8
   e01b3:	movabs $0x3030303030303030,%r9
   e01bd:	jae    e065a <sessions::fast::parse_events_avx2+0x1cba>
   e01c3:	lea    0x0(,%rbx,8),%eax
   e01ca:	cmp    $0x8,%rbx
   e01ce:	shrx   %rax,%r9,%rcx
   e01d3:	mov    $0x0,%eax
   e01d8:	cmovne %rcx,%rax
   e01dc:	neg    %sil
   e01df:	shl    $0x3,%sil
   e01e3:	shlx   %rsi,(%r14),%rcx
   e01e8:	or     %rcx,%rax
   e01eb:	xor    %r9,%rax
   e01ee:	lea    (%rax,%r8,1),%rdx
   e01f2:	or     %rcx,%rdx
   e01f5:	mov    $0xffffffff,%ecx
   e01fa:	mov    %rcx,0x10(%rsp)
   e01ff:	test   %rdi,%rdx
   e0202:	jne    e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0208:	lea    (%rax,%rax,4),%rcx
   e020c:	shr    $0x8,%rax
   e0210:	lea    (%rax,%rcx,2),%rbp
   e0214:	mov    %rbp,%rax
   e0217:	movabs $0xff000000ff,%rcx
   e0221:	and    %rcx,%rax
   e0224:	movabs $0xf424000000064,%rdx
   e022e:	imul   %rdx,%rax
   e0232:	shr    $0x10,%rbp
   e0236:	and    %rcx,%rbp
   e0239:	movabs $0x271000000001,%rcx
   e0243:	imul   %rcx,%rbp
   e0247:	add    %rax,%rbp
   e024a:	shr    $0x20,%rbp
   e024e:	jmp    e02de <sessions::fast::parse_events_avx2+0x193e>
   e0253:	test   %rbx,%rbx
   e0256:	je     e0550 <sessions::fast::parse_events_avx2+0x1bb0>
   e025c:	xor    %eax,%eax
   e025e:	xor    %edx,%edx
   e0260:	xor    %ecx,%ecx
   e0262:	xor    %ebp,%ebp
   e0264:	mov    0x10(%rsp),%rbx
   e0269:	nopl   0x0(%rax)
   e0270:	movzbl (%r14,%rdx,1),%esi
   e0275:	add    $0xd0,%sil
   e0279:	cmp    $0x9,%sil
   e027d:	ja     e0550 <sessions::fast::parse_events_avx2+0x1bb0>
   e0283:	test   %sil,%sil
   e0286:	setne  %r8b
   e028a:	or     %r8b,%al
   e028d:	movzbl %al,%r8d
   e0291:	and    $0x1,%r8d
   e0295:	add    %r8d,%ecx
   e0298:	lea    0x0(,%rbp,4),%r8
   e02a0:	add    %rbp,%r8
   e02a3:	movzbl %sil,%esi
   e02a7:	lea    (%rsi,%r8,2),%rbp
   e02ab:	inc    %rdx
   e02ae:	cmp    %rdx,%rbx
   e02b1:	jne    e0270 <sessions::fast::parse_events_avx2+0x18d0>
   e02b3:	mov    %r9,0x18(%rsp)
   e02b8:	mov    $0xffffffff,%eax
   e02bd:	mov    %rax,0x10(%rsp)
   e02c2:	mov    %rdi,0x78(%rsp)
   e02c7:	cmp    $0x14,%ecx
   e02ca:	setb   %al
   e02cd:	test   %rbp,%rbp
   e02d0:	setns  %cl
   e02d3:	and    %al,%cl
   e02d5:	cmp    $0x1,%cl
   e02d8:	jne    e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e02de:	mov    %rbp,%rax
   e02e1:	mov    0x18(%rsp),%r9
   e02e6:	sub    0x950(%r9),%rax
   e02ed:	mov    %rax,%rdx
   e02f0:	shr    $0x3,%rdx
   e02f4:	movabs $0x20c49ba5e353f7cf,%rcx
   e02fe:	mulx   %rcx,%rsi,%rsi
   e0303:	movabs $0x3e7fffffc18,%rcx
   e030d:	cmp    %rcx,%rax
   e0310:	jae    e0322 <sessions::fast::parse_events_avx2+0x1982>
   e0312:	shr    $0x4,%rsi
   e0316:	imul   $0x3e8,%rsi,%rcx
   e031d:	cmp    %rcx,%rax
   e0320:	je     e032f <sessions::fast::parse_events_avx2+0x198f>
   e0322:	movb   $0x1,0x530(%rsp)
   e032a:	mov    $0xffffffff,%esi
   e032f:	mov    0x50(%rsp),%rdx
   e0334:	mov    0x68(%rsp),%rdi
   e0339:	blsr   0x88(%rsp),%rax
   e0343:	tzcnt  %rax,%rax
   e0348:	lea    0x1(%rdx),%ecx
   e034b:	shrx   %rcx,%r13,%rbx
   e0350:	and    $0x1,%ebx
   e0353:	lea    (%rdx,%rbx,2),%ecx
   e0356:	inc    %ecx
   e0358:	mov    %eax,%r8d
   e035b:	sub    %ecx,%r8d
   e035e:	mov    %rsi,0x10(%rsp)
   e0363:	je     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0369:	blsr   0x20(%rsp),%rcx
   e0370:	blsr   %rcx,%rdx
   e0375:	tzcnt  %rcx,%r14
   e037a:	tzcnt  %rdx,%rdx
   e037f:	lea    0x1(%r14),%ecx
   e0383:	shrx   %rcx,%rdi,%rdi
   e0388:	and    $0x1,%edi
   e038b:	mov    %r14,0x48(%rsp)
   e0390:	lea    (%r14,%rdi,2),%r14d
   e0394:	inc    %r14d
   e0397:	cmp    %r14d,%edx
   e039a:	je     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e03a0:	mov    %rbx,0x70(%rsp)
   e03a5:	mov    %r8,0x88(%rsp)
   e03ad:	lea    0x1(%rax),%ecx
   e03b0:	shrx   %rcx,%r13,%rcx
   e03b5:	and    $0x1,%ecx
   e03b8:	lea    (%rcx,%rax,1),%ebx
   e03bb:	inc    %ebx
   e03bd:	lea    (%rax,%rcx,2),%ecx
   e03c0:	inc    %ecx
   e03c2:	mov    %r12d,%eax
   e03c5:	sub    %ecx,%eax
   e03c7:	add    0xa8(%rsp),%rbx
   e03cf:	cmp    $0x19,%rax
   e03d3:	mov    %rdx,0x20(%rsp)
   e03d8:	mov    %r14d,0x30(%rsp)
   e03dd:	je     e0adb <sessions::fast::parse_events_avx2+0x213b>
   e03e3:	cmp    $0x14,%eax
   e03e6:	jne    e0d01 <sessions::fast::parse_events_avx2+0x2361>
   e03ec:	cmpb   $0x5a,0x13(%rbx)
   e03f0:	jne    e0e40 <sessions::fast::parse_events_avx2+0x24a0>
   e03f6:	mov    (%rbx),%rdx
   e03f9:	mov    0x930(%r9),%rcx
   e0400:	imul   %rdx,%rcx
   e0404:	shr    $0x3c,%rcx
   e0408:	cmp    %rdx,0x6e8(%r9,%rcx,8)
   e0410:	mov    %r9,0x18(%rsp)
   e0415:	mov    %rdi,%r14
   e0418:	mov    %r11,%r13
   e041b:	mov    %r10,%r12
   e041e:	jne    e2cb2 <sessions::fast::parse_events_avx2+0x4312>
   e0424:	mov    0x768(%r9,%rcx,8),%rax
   e042c:	mov    0x7e8(%r9,%rcx,8),%rcx
   e0434:	movabs $0x7676767676767676,%r9
   e043e:	movzwl 0x8(%rbx),%edx
   e0442:	xor    $0x3030,%rdx
   e0449:	mov    0xb(%rbx),%rdi
   e044d:	mov    %rdi,%rsi
   e0450:	movabs $0x3030303030303030,%r8
   e045a:	xor    %r8,%rsi
   e045d:	lea    0x7676(%rdx),%r8d
   e0464:	or     %edx,%r8d
   e0467:	and    $0x8080,%r8d
   e046e:	add    %rsi,%r9
   e0471:	or     %rdi,%r9
   e0474:	movabs $0x8080008080008080,%r10
   e047e:	and    %r10,%r9
   e0481:	xor    %r10d,%r10d
   e0484:	cmpb   $0x54,0xa(%rbx)
   e0488:	setne  %r10b
   e048c:	movabs $0xff0000ff0000,%r11
   e0496:	and    %r11,%rdi
   e0499:	or     %r10,%rdi
   e049c:	or     %r9,%rdi
   e049f:	or     %r8,%rdi
   e04a2:	movabs $0x3a00003a0000,%r8
   e04ac:	cmp    %r8,%rdi
   e04af:	jne    e2d28 <sessions::fast::parse_events_avx2+0x4388>
   e04b5:	lea    (%rsi,%rsi,4),%rdi
   e04b9:	shr    $0x8,%rsi
   e04bd:	lea    (%rsi,%rdi,2),%r8
   e04c1:	mov    %r8,%rsi
   e04c4:	shr    $0x30,%rsi
   e04c8:	movzbl %sil,%esi
   e04cc:	cmp    $0x3b,%rsi
   e04d0:	mov    %r12,%r10
   e04d3:	mov    %r13,%r11
   e04d6:	ja     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e04dc:	mov    %r8d,%edi
   e04df:	shr    $0x18,%edi
   e04e2:	cmp    $0x3b,%edi
   e04e5:	ja     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e04eb:	movzbl %r8b,%r8d
   e04ef:	cmp    $0x17,%r8d
   e04f3:	ja     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e04f9:	movzbl %dl,%r9d
   e04fd:	lea    (%r9,%r9,4),%r9
   e0501:	shr    $0x8,%edx
   e0504:	lea    (%rdx,%r9,2),%rdx
   e0508:	test   %rdx,%rdx
   e050b:	je     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0511:	cmp    %rcx,%rdx
   e0514:	jg     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e051a:	add    %rax,%rdx
   e051d:	imul   $0x15180,%rdx,%rax
   e0524:	imul   $0xe10,%r8,%rcx
   e052b:	imul   $0x3c,%rdi,%rdx
   e052f:	add    %rsi,%rcx
   e0532:	add    %rdx,%rcx
   e0535:	add    %rax,%rcx
   e0538:	imul   $0x3e8,%rcx,%r12
   e053f:	add    $0xfffffffffad9a400,%r12
   e0546:	mov    0x18(%rsp),%r9
   e054b:	jmp    e1175 <sessions::fast::parse_events_avx2+0x27d5>
   e0550:	mov    $0xffffffff,%eax
   e0555:	mov    %rax,0x10(%rsp)
   e055a:	jmp    e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e055f:	mov    $0xffffffff,%eax
   e0564:	mov    %rax,0x10(%rsp)
   e0569:	mov    %r14,%r10
   e056c:	mov    %rbp,%r11
   e056f:	mov    0x40(%rsp),%r15
   e0574:	jmp    e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0579:	mov    %eax,%ecx
   e057b:	add    $0xfffffffffffffff8,%rax
   e057f:	lea    0x0(,%rax,8),%edx
   e0586:	cmp    $0x10,%ecx
   e0589:	shrx   %rdx,%r9,%rcx
   e058e:	mov    $0x0,%edx
   e0593:	cmovae %rdx,%rcx
   e0597:	mov    %eax,%edx
   e0599:	neg    %dl
   e059b:	shl    $0x3,%dl
   e059e:	shlx   %rdx,(%rbx),%rdx
   e05a3:	or     %rdx,%rcx
   e05a6:	xor    %r9,%rcx
   e05a9:	lea    (%rcx,%r8,1),%rsi
   e05ad:	or     %rdx,%rsi
   e05b0:	mov    $0xffffffff,%edx
   e05b5:	mov    %rdx,0x10(%rsp)
   e05ba:	test   %rdi,%rsi
   e05bd:	jne    e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e05c3:	mov    (%rbx,%rax,1),%rax
   e05c7:	mov    %rax,%rdx
   e05ca:	xor    %r9,%rdx
   e05cd:	lea    (%rdx,%r8,1),%rsi
   e05d1:	or     %rax,%rsi
   e05d4:	test   %rdi,%rsi
   e05d7:	jne    e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e05dd:	lea    (%rcx,%rcx,4),%rax
   e05e1:	shr    $0x8,%rcx
   e05e5:	lea    (%rcx,%rax,2),%rax
   e05e9:	mov    %rax,%rcx
   e05ec:	movabs $0xff000000ff,%rsi
   e05f6:	and    %rsi,%rcx
   e05f9:	movabs $0xf424000000064,%rdi
   e0603:	imul   %rdi,%rcx
   e0607:	shr    $0x10,%rax
   e060b:	and    %rsi,%rax
   e060e:	movabs $0x271000000001,%r8
   e0618:	imul   %r8,%rax
   e061c:	add    %rcx,%rax
   e061f:	shr    $0x20,%rax
   e0623:	lea    (%rdx,%rdx,4),%rcx
   e0627:	shr    $0x8,%rdx
   e062b:	lea    (%rdx,%rcx,2),%rcx
   e062f:	mov    %rcx,%rdx
   e0632:	and    %rsi,%rdx
   e0635:	imul   %rdi,%rdx
   e0639:	shr    $0x10,%rcx
   e063d:	and    %rsi,%rcx
   e0640:	imul   %r8,%rcx
   e0644:	add    %rdx,%rcx
   e0647:	shr    $0x20,%rcx
   e064b:	imul   $0x5f5e100,%rax,%r13
   e0652:	add    %rcx,%r13
   e0655:	jmp    dfa93 <sessions::fast::parse_events_avx2+0x10f3>
   e065a:	lea    -0x8(%rbx),%rcx
   e065e:	lea    0x0(,%rcx,8),%eax
   e0665:	cmp    $0x10,%rbx
   e0669:	shrx   %rax,%r9,%rax
   e066e:	mov    $0x0,%edx
   e0673:	cmovae %rdx,%rax
   e0677:	mov    %ecx,%edx
   e0679:	neg    %dl
   e067b:	shl    $0x3,%dl
   e067e:	shlx   %rdx,(%r14),%rdx
   e0683:	or     %rdx,%rax
   e0686:	xor    %r9,%rax
   e0689:	lea    (%rax,%r8,1),%rsi
   e068d:	or     %rdx,%rsi
   e0690:	mov    $0xffffffff,%edx
   e0695:	mov    %rdx,0x10(%rsp)
   e069a:	test   %rdi,%rsi
   e069d:	jne    e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e06a3:	mov    (%r14,%rcx,1),%rdx
   e06a7:	mov    %rdx,%rcx
   e06aa:	xor    %r9,%rcx
   e06ad:	lea    (%rcx,%r8,1),%rsi
   e06b1:	or     %rdx,%rsi
   e06b4:	test   %rdi,%rsi
   e06b7:	jne    e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e06bd:	lea    (%rax,%rax,4),%rdx
   e06c1:	shr    $0x8,%rax
   e06c5:	lea    (%rax,%rdx,2),%rax
   e06c9:	mov    %rax,%rdx
   e06cc:	movabs $0xff000000ff,%rsi
   e06d6:	and    %rsi,%rdx
   e06d9:	movabs $0xf424000000064,%rdi
   e06e3:	imul   %rdi,%rdx
   e06e7:	shr    $0x10,%rax
   e06eb:	and    %rsi,%rax
   e06ee:	movabs $0x271000000001,%r8
   e06f8:	imul   %r8,%rax
   e06fc:	add    %rdx,%rax
   e06ff:	shr    $0x20,%rax
   e0703:	lea    (%rcx,%rcx,4),%rdx
   e0707:	shr    $0x8,%rcx
   e070b:	lea    (%rcx,%rdx,2),%rcx
   e070f:	mov    %rcx,%rdx
   e0712:	and    %rsi,%rdx
   e0715:	imul   %rdi,%rdx
   e0719:	shr    $0x10,%rcx
   e071d:	and    %rsi,%rcx
   e0720:	imul   %r8,%rcx
   e0724:	add    %rdx,%rcx
   e0727:	shr    $0x20,%rcx
   e072b:	imul   $0x5f5e100,%rax,%rbp
   e0732:	add    %rcx,%rbp
   e0735:	jmp    e02de <sessions::fast::parse_events_avx2+0x193e>
   e073a:	mov    $0xffffffff,%eax
   e073f:	mov    %rax,0x10(%rsp)
   e0744:	mov    %rbx,%r10
   e0747:	mov    %r14,%r11
   e074a:	mov    %rbp,%r15
   e074d:	jmp    e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0752:	mov    $0x8,%ecx
   e0757:	xor    %eax,%eax
   e0759:	xor    (%r14,%rax,1),%rdx
   e075d:	mulx   %r8,%rax,%rdx
   e0762:	xor    %rax,%rdx
   e0765:	mov    %rcx,%rax
   e0768:	cmp    %r12,%rax
   e076b:	jne    df1d9 <sessions::fast::parse_events_avx2+0x839>
   e0771:	jmp    df1f4 <sessions::fast::parse_events_avx2+0x854>
   e0776:	mov    $0x8,%ecx
   e077b:	xor    %eax,%eax
   e077d:	mov    0x10(%rsp),%rbx
   e0782:	xor    (%r14,%rax,1),%rdx
   e0786:	mulx   %r8,%rax,%rdx
   e078b:	xor    %rax,%rdx
   e078e:	mov    %rcx,%rax
   e0791:	cmp    %rbp,%rax
   e0794:	je     e07b0 <sessions::fast::parse_events_avx2+0x1e10>
   e0796:	mov    %ebp,%ecx
   e0798:	neg    %ecx
   e079a:	shl    $0x3,%ecx
   e079d:	and    $0x38,%cl
   e07a0:	mov    $0x40,%esi
   e07a5:	sub    %ecx,%esi
   e07a7:	bzhi   %rsi,(%r14,%rax,1),%rax
   e07ad:	xor    %rax,%rdx
   e07b0:	mov    0x58(%rsp),%rsi
   e07b5:	movabs $0xa0761d6478bd642f,%rax
   e07bf:	mulx   %rax,%rax,%r15
   e07c4:	xor    %rax,%r15
   e07c7:	shl    $0x30,%rbp
   e07cb:	or     %r14,%rbp
   e07ce:	movabs $0xff00000000000000,%rax
   e07d8:	or     %rax,%rbp
   e07db:	mov    %rbp,%r10
   e07de:	mov    %r15,%rax
   e07e1:	mov    0x48(%rsp),%r14
   e07e6:	jmp    dfdb2 <sessions::fast::parse_events_avx2+0x1412>
   e07eb:	movzbl 0x13(%rbx),%r15d
   e07f0:	cmp    $0x2b,%r15d
   e07f4:	je     e0800 <sessions::fast::parse_events_avx2+0x1e60>
   e07f6:	cmp    $0x2d,%r15d
   e07fa:	jne    e0dcb <sessions::fast::parse_events_avx2+0x242b>
   e0800:	mov    %r14,0x38(%rsp)
   e0805:	mov    (%rbx),%rdx
   e0808:	mov    0x930(%r9),%rcx
   e080f:	imul   %rdx,%rcx
   e0813:	shr    $0x3c,%rcx
   e0817:	cmp    %rdx,0x6e8(%r9,%rcx,8)
   e081f:	mov    %r11,0x58(%rsp)
   e0824:	mov    %r10,%r14
   e0827:	jne    e2b8f <sessions::fast::parse_events_avx2+0x41ef>
   e082d:	mov    0x768(%r9,%rcx,8),%rax
   e0835:	mov    0x7e8(%r9,%rcx,8),%rdx
   e083d:	movabs $0x7676767676767676,%r9
   e0847:	movzwl 0x8(%rbx),%r8d
   e084c:	xor    $0x3030,%r8
   e0853:	mov    0xb(%rbx),%rsi
   e0857:	mov    %rsi,%rcx
   e085a:	movabs $0x3030303030303030,%rdi
   e0864:	xor    %rdi,%rcx
   e0867:	lea    0x7676(%r8),%edi
   e086e:	or     %r8d,%edi
   e0871:	and    $0x8080,%edi
   e0877:	add    %rcx,%r9
   e087a:	or     %rsi,%r9
   e087d:	movabs $0x8080008080008080,%r10
   e0887:	and    %r10,%r9
   e088a:	xor    %r10d,%r10d
   e088d:	cmpb   $0x54,0xa(%rbx)
   e0891:	setne  %r10b
   e0895:	movabs $0xff0000ff0000,%r11
   e089f:	and    %r11,%rsi
   e08a2:	or     %r10,%rsi
   e08a5:	or     %r9,%rsi
   e08a8:	or     %rdi,%rsi
   e08ab:	movabs $0x3a00003a0000,%rdi
   e08b5:	cmp    %rdi,%rsi
   e08b8:	jne    e0a17 <sessions::fast::parse_events_avx2+0x2077>
   e08be:	lea    (%rcx,%rcx,4),%rsi
   e08c2:	shr    $0x8,%rcx
   e08c6:	lea    (%rcx,%rsi,2),%rdi
   e08ca:	mov    %rdi,%rcx
   e08cd:	shr    $0x30,%rcx
   e08d1:	movzbl %cl,%ecx
   e08d4:	cmp    $0x3b,%rcx
   e08d8:	mov    %r14,%r10
   e08db:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e08e1:	mov    %edi,%esi
   e08e3:	shr    $0x18,%esi
   e08e6:	cmp    $0x3b,%esi
   e08e9:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e08ef:	movzbl %dil,%edi
   e08f3:	cmp    $0x17,%edi
   e08f6:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e08fc:	movzbl %r8b,%r9d
   e0900:	lea    (%r9,%r9,4),%r9
   e0904:	shr    $0x8,%r8d
   e0908:	lea    (%r8,%r9,2),%r8
   e090c:	test   %r8,%r8
   e090f:	je     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e0915:	cmp    %rdx,%r8
   e0918:	jg     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e091e:	cmpb   $0x3a,0x16(%rbx)
   e0922:	jne    e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e0928:	movzbl 0x14(%rbx),%edx
   e092c:	add    $0xd0,%dl
   e092f:	cmp    $0x9,%dl
   e0932:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e0938:	movzbl 0x15(%rbx),%r9d
   e093d:	add    $0xd0,%r9b
   e0941:	cmp    $0x9,%r9b
   e0945:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e094b:	movzbl 0x17(%rbx),%r11d
   e0950:	add    $0xd0,%r11b
   e0954:	cmp    $0x9,%r11b
   e0958:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e095e:	mov    %rbp,0x90(%rsp)
   e0966:	mov    %r12,%rbp
   e0969:	mov    %r10,%r12
   e096c:	movzbl 0x18(%rbx),%r10d
   e0971:	add    $0xd0,%r10b
   e0975:	cmp    $0x9,%r10b
   e0979:	ja     e14c0 <sessions::fast::parse_events_avx2+0x2b20>
   e097f:	movzbl %dl,%edx
   e0982:	add    %edx,%edx
   e0984:	lea    (%rdx,%rdx,4),%edx
   e0987:	add    %r9b,%dl
   e098a:	cmp    $0x17,%dl
   e098d:	ja     e14c0 <sessions::fast::parse_events_avx2+0x2b20>
   e0993:	movzbl %r11b,%r9d
   e0997:	add    %r9d,%r9d
   e099a:	lea    (%r9,%r9,4),%r9d
   e099e:	add    %r10b,%r9b
   e09a1:	cmp    $0x3b,%r9b
   e09a5:	ja     e14c0 <sessions::fast::parse_events_avx2+0x2b20>
   e09ab:	add    %rax,%r8
   e09ae:	imul   $0x15180,%r8,%rax
   e09b5:	imul   $0xe10,%rdi,%rdi
   e09bc:	imul   $0x3c,%rsi,%rsi
   e09c0:	add    %rcx,%rdi
   e09c3:	add    %rsi,%rdi
   e09c6:	add    %rax,%rdi
   e09c9:	imul   $0x3e8,%rdi,%rax
   e09d0:	add    $0xfffffffffad9a400,%rax
   e09d6:	movzbl %r9b,%ecx
   e09da:	movzbl %dl,%edx
   e09dd:	imul   $0x36ee80,%rdx,%rdx
   e09e4:	imul   $0xea60,%rcx,%rcx
   e09eb:	add    %rdx,%rcx
   e09ee:	mov    %rcx,%r14
   e09f1:	neg    %r14
   e09f4:	cmp    $0x2b,%r15b
   e09f8:	cmovne %rcx,%r14
   e09fc:	add    %rax,%r14
   e09ff:	mov    %r12,%r10
   e0a02:	mov    %rbp,%r12
   e0a05:	mov    0x90(%rsp),%rbp
   e0a0d:	mov    0x58(%rsp),%r11
   e0a12:	jmp    e0f7e <sessions::fast::parse_events_avx2+0x25de>
   e0a17:	mov    %r14,%r10
   e0a1a:	jmp    e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e0a1f:	lea    -0x1(%rax),%edx
   e0a22:	cmp    $0x10,%edx
   e0a25:	jae    e0dbe <sessions::fast::parse_events_avx2+0x241e>
   e0a2b:	cmp    $0x9,%eax
   e0a2e:	movabs $0x8080808080808080,%rdi
   e0a38:	movabs $0x7676767676767676,%r8
   e0a42:	movabs $0x3030303030303030,%r9
   e0a4c:	jae    e0ea7 <sessions::fast::parse_events_avx2+0x2507>
   e0a52:	lea    0x0(,%rax,8),%ecx
   e0a59:	cmp    $0x8,%rax
   e0a5d:	shrx   %rcx,%r9,%rdx
   e0a62:	mov    $0x0,%ecx
   e0a67:	cmovne %rdx,%rcx
   e0a6b:	neg    %al
   e0a6d:	shl    $0x3,%al
   e0a70:	shlx   %rax,(%rbx),%rax
   e0a75:	or     %rax,%rcx
   e0a78:	xor    %r9,%rcx
   e0a7b:	lea    (%rcx,%r8,1),%rdx
   e0a7f:	or     %rax,%rdx
   e0a82:	test   %rdi,%rdx
   e0a85:	jne    e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e0a8b:	mov    %r14,0x38(%rsp)
   e0a90:	lea    (%rcx,%rcx,4),%rax
   e0a94:	shr    $0x8,%rcx
   e0a98:	lea    (%rcx,%rax,2),%r14
   e0a9c:	mov    %r14,%rax
   e0a9f:	movabs $0xff000000ff,%rcx
   e0aa9:	and    %rcx,%rax
   e0aac:	movabs $0xf424000000064,%rdx
   e0ab6:	imul   %rdx,%rax
   e0aba:	shr    $0x10,%r14
   e0abe:	and    %rcx,%r14
   e0ac1:	movabs $0x271000000001,%rcx
   e0acb:	imul   %rcx,%r14
   e0acf:	add    %rax,%r14
   e0ad2:	shr    $0x20,%r14
   e0ad6:	jmp    e0f7e <sessions::fast::parse_events_avx2+0x25de>
   e0adb:	movzbl 0x13(%rbx),%ecx
   e0adf:	cmp    $0x2b,%ecx
   e0ae2:	je     e0aed <sessions::fast::parse_events_avx2+0x214d>
   e0ae4:	cmp    $0x2d,%ecx
   e0ae7:	jne    e0e40 <sessions::fast::parse_events_avx2+0x24a0>
   e0aed:	mov    %ecx,0x40(%rsp)
   e0af1:	mov    (%rbx),%rdx
   e0af4:	mov    0x930(%r9),%rcx
   e0afb:	imul   %rdx,%rcx
   e0aff:	shr    $0x3c,%rcx
   e0b03:	cmp    %rdx,0x6e8(%r9,%rcx,8)
   e0b0b:	mov    %r9,0x18(%rsp)
   e0b10:	mov    %rdi,%r14
   e0b13:	mov    %r11,%r13
   e0b16:	mov    %r10,%r12
   e0b19:	jne    e2bee <sessions::fast::parse_events_avx2+0x424e>
   e0b1f:	mov    0x768(%r9,%rcx,8),%rax
   e0b27:	mov    0x7e8(%r9,%rcx,8),%rdx
   e0b2f:	movabs $0x7676767676767676,%r9
   e0b39:	movzwl 0x8(%rbx),%r8d
   e0b3e:	xor    $0x3030,%r8
   e0b45:	mov    0xb(%rbx),%rsi
   e0b49:	mov    %rsi,%rcx
   e0b4c:	movabs $0x3030303030303030,%rdi
   e0b56:	xor    %rdi,%rcx
   e0b59:	lea    0x7676(%r8),%edi
   e0b60:	or     %r8d,%edi
   e0b63:	and    $0x8080,%edi
   e0b69:	add    %rcx,%r9
   e0b6c:	or     %rsi,%r9
   e0b6f:	movabs $0x8080008080008080,%r10
   e0b79:	and    %r10,%r9
   e0b7c:	xor    %r10d,%r10d
   e0b7f:	cmpb   $0x54,0xa(%rbx)
   e0b83:	setne  %r10b
   e0b87:	movabs $0xff0000ff0000,%r11
   e0b91:	and    %r11,%rsi
   e0b94:	or     %r10,%rsi
   e0b97:	or     %r9,%rsi
   e0b9a:	or     %rdi,%rsi
   e0b9d:	movabs $0x3a00003a0000,%rdi
   e0ba7:	cmp    %rdi,%rsi
   e0baa:	jne    e2d28 <sessions::fast::parse_events_avx2+0x4388>
   e0bb0:	lea    (%rcx,%rcx,4),%rsi
   e0bb4:	shr    $0x8,%rcx
   e0bb8:	lea    (%rcx,%rsi,2),%rdi
   e0bbc:	mov    %rdi,%rcx
   e0bbf:	shr    $0x30,%rcx
   e0bc3:	movzbl %cl,%ecx
   e0bc6:	cmp    $0x3b,%rcx
   e0bca:	mov    %r12,%r10
   e0bcd:	mov    %r13,%r11
   e0bd0:	ja     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0bd6:	mov    %edi,%esi
   e0bd8:	shr    $0x18,%esi
   e0bdb:	cmp    $0x3b,%esi
   e0bde:	ja     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0be4:	movzbl %dil,%edi
   e0be8:	cmp    $0x17,%edi
   e0beb:	ja     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0bf1:	movzbl %r8b,%r9d
   e0bf5:	lea    (%r9,%r9,4),%r9
   e0bf9:	shr    $0x8,%r8d
   e0bfd:	lea    (%r8,%r9,2),%r8
   e0c01:	test   %r8,%r8
   e0c04:	je     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0c0a:	cmp    %rdx,%r8
   e0c0d:	jg     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0c13:	cmpb   $0x3a,0x16(%rbx)
   e0c17:	jne    e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0c1d:	movzbl 0x14(%rbx),%edx
   e0c21:	add    $0xd0,%dl
   e0c24:	cmp    $0x9,%dl
   e0c27:	ja     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0c2d:	movzbl 0x15(%rbx),%r9d
   e0c32:	add    $0xd0,%r9b
   e0c36:	cmp    $0x9,%r9b
   e0c3a:	ja     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0c40:	mov    %r11,%r13
   e0c43:	movzbl 0x17(%rbx),%r11d
   e0c48:	add    $0xd0,%r11b
   e0c4c:	cmp    $0x9,%r11b
   e0c50:	ja     e2d2b <sessions::fast::parse_events_avx2+0x438b>
   e0c56:	mov    %r10,0x58(%rsp)
   e0c5b:	movzbl 0x18(%rbx),%r10d
   e0c60:	add    $0xd0,%r10b
   e0c64:	cmp    $0x9,%r10b
   e0c68:	ja     e14d3 <sessions::fast::parse_events_avx2+0x2b33>
   e0c6e:	movzbl %dl,%edx
   e0c71:	add    %edx,%edx
   e0c73:	lea    (%rdx,%rdx,4),%edx
   e0c76:	add    %r9b,%dl
   e0c79:	cmp    $0x17,%dl
   e0c7c:	ja     e14d3 <sessions::fast::parse_events_avx2+0x2b33>
   e0c82:	movzbl %r11b,%r9d
   e0c86:	add    %r9d,%r9d
   e0c89:	lea    (%r9,%r9,4),%r9d
   e0c8d:	add    %r10b,%r9b
   e0c90:	cmp    $0x3b,%r9b
   e0c94:	ja     e14d3 <sessions::fast::parse_events_avx2+0x2b33>
   e0c9a:	add    %rax,%r8
   e0c9d:	imul   $0x15180,%r8,%rax
   e0ca4:	imul   $0xe10,%rdi,%rdi
   e0cab:	imul   $0x3c,%rsi,%rsi
   e0caf:	add    %rcx,%rdi
   e0cb2:	add    %rsi,%rdi
   e0cb5:	add    %rax,%rdi
   e0cb8:	imul   $0x3e8,%rdi,%rax
   e0cbf:	add    $0xfffffffffad9a400,%rax
   e0cc5:	movzbl %r9b,%ecx
   e0cc9:	movzbl %dl,%edx
   e0ccc:	imul   $0x36ee80,%rdx,%rdx
   e0cd3:	imul   $0xea60,%rcx,%rcx
   e0cda:	add    %rdx,%rcx
   e0cdd:	mov    %rcx,%r12
   e0ce0:	neg    %r12
   e0ce3:	cmpb   $0x2b,0x40(%rsp)
   e0ce8:	cmovne %rcx,%r12
   e0cec:	add    %rax,%r12
   e0cef:	mov    0x58(%rsp),%r10
   e0cf4:	mov    %r13,%r11
   e0cf7:	mov    0x18(%rsp),%r9
   e0cfc:	jmp    e1175 <sessions::fast::parse_events_avx2+0x27d5>
   e0d01:	lea    -0x1(%rax),%edx
   e0d04:	cmp    $0x10,%edx
   e0d07:	jae    e0e37 <sessions::fast::parse_events_avx2+0x2497>
   e0d0d:	mov    %rdi,%r14
   e0d10:	mov    %r9,%r13
   e0d13:	cmp    $0x9,%eax
   e0d16:	movabs $0x8080808080808080,%rdi
   e0d20:	movabs $0x7676767676767676,%r8
   e0d2a:	movabs $0x3030303030303030,%r9
   e0d34:	jae    e10a0 <sessions::fast::parse_events_avx2+0x2700>
   e0d3a:	lea    0x0(,%rax,8),%ecx
   e0d41:	cmp    $0x8,%rax
   e0d45:	shrx   %rcx,%r9,%rdx
   e0d4a:	mov    $0x0,%ecx
   e0d4f:	cmovne %rdx,%rcx
   e0d53:	neg    %al
   e0d55:	shl    $0x3,%al
   e0d58:	shlx   %rax,(%rbx),%rax
   e0d5d:	or     %rax,%rcx
   e0d60:	xor    %r9,%rcx
   e0d63:	lea    (%rcx,%r8,1),%rdx
   e0d67:	or     %rax,%rdx
   e0d6a:	test   %rdi,%rdx
   e0d6d:	jne    e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0d73:	lea    (%rcx,%rcx,4),%rax
   e0d77:	shr    $0x8,%rcx
   e0d7b:	lea    (%rcx,%rax,2),%r12
   e0d7f:	mov    %r12,%rax
   e0d82:	movabs $0xff000000ff,%rcx
   e0d8c:	and    %rcx,%rax
   e0d8f:	movabs $0xf424000000064,%rdx
   e0d99:	imul   %rdx,%rax
   e0d9d:	shr    $0x10,%r12
   e0da1:	and    %rcx,%r12
   e0da4:	movabs $0x271000000001,%rcx
   e0dae:	imul   %rcx,%r12
   e0db2:	add    %rax,%r12
   e0db5:	shr    $0x20,%r12
   e0db9:	jmp    e1172 <sessions::fast::parse_events_avx2+0x27d2>
   e0dbe:	cmp    %ecx,0x98(%rsp)
   e0dc5:	je     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e0dcb:	mov    %r14,0x38(%rsp)
   e0dd0:	xor    %ecx,%ecx
   e0dd2:	xor    %esi,%esi
   e0dd4:	xor    %edx,%edx
   e0dd6:	xor    %r14d,%r14d
   e0dd9:	nopl   0x0(%rax)
   e0de0:	movzbl (%rbx,%rsi,1),%edi
   e0de4:	add    $0xd0,%dil
   e0de8:	cmp    $0x9,%dil
   e0dec:	ja     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e0df2:	test   %dil,%dil
   e0df5:	setne  %r8b
   e0df9:	or     %r8b,%cl
   e0dfc:	movzbl %cl,%r8d
   e0e00:	and    $0x1,%r8d
   e0e04:	add    %r8d,%edx
   e0e07:	lea    (%r14,%r14,4),%r8
   e0e0b:	movzbl %dil,%edi
   e0e0f:	lea    (%rdi,%r8,2),%r14
   e0e13:	inc    %rsi
   e0e16:	cmp    %rsi,%rax
   e0e19:	jne    e0de0 <sessions::fast::parse_events_avx2+0x2440>
   e0e1b:	cmp    $0x14,%edx
   e0e1e:	setb   %al
   e0e21:	test   %r14,%r14
   e0e24:	setns  %cl
   e0e27:	and    %al,%cl
   e0e29:	cmp    $0x1,%cl
   e0e2c:	je     e0f83 <sessions::fast::parse_events_avx2+0x25e3>
   e0e32:	jmp    e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e0e37:	cmp    %ecx,%r12d
   e0e3a:	je     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0e40:	mov    %rdi,%r14
   e0e43:	xor    %ecx,%ecx
   e0e45:	xor    %esi,%esi
   e0e47:	xor    %edx,%edx
   e0e49:	xor    %r12d,%r12d
   e0e4c:	nopl   0x0(%rax)
   e0e50:	movzbl (%rbx,%rsi,1),%edi
   e0e54:	add    $0xd0,%dil
   e0e58:	cmp    $0x9,%dil
   e0e5c:	ja     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0e62:	test   %dil,%dil
   e0e65:	setne  %r8b
   e0e69:	or     %r8b,%cl
   e0e6c:	movzbl %cl,%r8d
   e0e70:	and    $0x1,%r8d
   e0e74:	add    %r8d,%edx
   e0e77:	lea    (%r12,%r12,4),%r8
   e0e7b:	movzbl %dil,%edi
   e0e7f:	lea    (%rdi,%r8,2),%r12
   e0e83:	inc    %rsi
   e0e86:	cmp    %rsi,%rax
   e0e89:	jne    e0e50 <sessions::fast::parse_events_avx2+0x24b0>
   e0e8b:	cmp    $0x14,%edx
   e0e8e:	setb   %al
   e0e91:	test   %r12,%r12
   e0e94:	setns  %cl
   e0e97:	and    %al,%cl
   e0e99:	cmp    $0x1,%cl
   e0e9c:	je     e1175 <sessions::fast::parse_events_avx2+0x27d5>
   e0ea2:	jmp    e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e0ea7:	mov    %eax,%ecx
   e0ea9:	add    $0xfffffffffffffff8,%rax
   e0ead:	lea    0x0(,%rax,8),%edx
   e0eb4:	cmp    $0x10,%ecx
   e0eb7:	shrx   %rdx,%r9,%rcx
   e0ebc:	mov    $0x0,%edx
   e0ec1:	cmovae %rdx,%rcx
   e0ec5:	mov    %eax,%edx
   e0ec7:	neg    %dl
   e0ec9:	shl    $0x3,%dl
   e0ecc:	shlx   %rdx,(%rbx),%rdx
   e0ed1:	or     %rdx,%rcx
   e0ed4:	xor    %r9,%rcx
   e0ed7:	lea    (%rcx,%r8,1),%rsi
   e0edb:	or     %rdx,%rsi
   e0ede:	test   %rdi,%rsi
   e0ee1:	jne    e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e0ee7:	mov    (%rbx,%rax,1),%rax
   e0eeb:	mov    %rax,%rdx
   e0eee:	xor    %r9,%rdx
   e0ef1:	lea    (%rdx,%r8,1),%rsi
   e0ef5:	or     %rax,%rsi
   e0ef8:	test   %rdi,%rsi
   e0efb:	jne    e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e0f01:	mov    %r14,0x38(%rsp)
   e0f06:	lea    (%rcx,%rcx,4),%rax
   e0f0a:	shr    $0x8,%rcx
   e0f0e:	lea    (%rcx,%rax,2),%rax
   e0f12:	mov    %rax,%rcx
   e0f15:	movabs $0xff000000ff,%rsi
   e0f1f:	and    %rsi,%rcx
   e0f22:	movabs $0xf424000000064,%rdi
   e0f2c:	imul   %rdi,%rcx
   e0f30:	shr    $0x10,%rax
   e0f34:	and    %rsi,%rax
   e0f37:	movabs $0x271000000001,%r8
   e0f41:	imul   %r8,%rax
   e0f45:	add    %rcx,%rax
   e0f48:	shr    $0x20,%rax
   e0f4c:	lea    (%rdx,%rdx,4),%rcx
   e0f50:	shr    $0x8,%rdx
   e0f54:	lea    (%rdx,%rcx,2),%rcx
   e0f58:	mov    %rcx,%rdx
   e0f5b:	and    %rsi,%rdx
   e0f5e:	imul   %rdi,%rdx
   e0f62:	shr    $0x10,%rcx
   e0f66:	and    %rsi,%rcx
   e0f69:	imul   %r8,%rcx
   e0f6d:	add    %rdx,%rcx
   e0f70:	shr    $0x20,%rcx
   e0f74:	imul   $0x5f5e100,%rax,%r14
   e0f7b:	add    %rcx,%r14
   e0f7e:	mov    0x50(%rsp),%r9
   e0f83:	cmp    %r14,0x938(%r9)
   e0f8a:	jg     e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e0f90:	mov    %r12,0x98(%rsp)
   e0f98:	xor    %eax,%eax
   e0f9a:	cmp    %r14,%r13
   e0f9d:	setns  %al
   e0fa0:	movabs $0x7fffffffffffffff,%rcx
   e0faa:	add    %rcx,%rax
   e0fad:	sub    %r14,%r13
   e0fb0:	cmovo  %rax,%r13
   e0fb4:	cmp    0x940(%r9),%r14
   e0fbb:	jge    e16c7 <sessions::fast::parse_events_avx2+0x2d27>
   e0fc1:	cmp    $0x5265c00,%r13
   e0fc8:	jg     e16c7 <sessions::fast::parse_events_avx2+0x2d27>
   e0fce:	mov    0x68(%rsp),%rsi
   e0fd3:	and    $0x1,%esi
   e0fd6:	mov    0x88(%rsp),%rdx
   e0fde:	lea    (%rdx,%rsi,2),%ecx
   e0fe1:	inc    %ecx
   e0fe3:	mov    0x18(%rsp),%rax
   e0fe8:	sub    %ecx,%eax
   e0fea:	lea    (%rdx,%rsi,1),%rcx
   e0fee:	inc    %rcx
   e0ff1:	mov    0xa8(%rsp),%r13
   e0ff9:	mov    0x0(%r13,%rcx,1),%rcx
   e0ffe:	cmp    $0x8,%eax
   e1001:	mov    0x60(%rsp),%rsi
   e1006:	jne    e12a3 <sessions::fast::parse_events_avx2+0x2903>
   e100c:	movabs $0x6573616863727570,%rdx
   e1016:	cmp    %rdx,%rcx
   e1019:	jne    e12a3 <sessions::fast::parse_events_avx2+0x2903>
   e101f:	mov    0x30(%rsp),%rax
   e1024:	and    $0x1,%eax
   e1027:	mov    0x70(%rsp),%r15
   e102c:	lea    (%r15,%rax,2),%edx
   e1030:	inc    %edx
   e1032:	cmp    %edx,%esi
   e1034:	je     e16c7 <sessions::fast::parse_events_avx2+0x2d27>
   e103a:	add    %r15d,%eax
   e103d:	inc    %eax
   e103f:	sub    0x78(%rsp),%r15d
   e1044:	mov    %esi,%ecx
   e1046:	sub    %edx,%ecx
   e1048:	add    %r13,%rax
   e104b:	mov    0x18(%rsp),%rdx
   e1050:	mov    0x20(%rsp),%rsi
   e1055:	add    %rdx,%rsi
   e1058:	inc    %rsi
   e105b:	xor    %ebx,%ebx
   e105d:	xor    %edx,%edx
   e105f:	movabs $0xe7037ed1a0b428db,%r9
   e1069:	cmp    %rdx,%rcx
   e106c:	je     e15d2 <sessions::fast::parse_events_avx2+0x2c32>
   e1072:	movzbl (%rax,%rdx,1),%edi
   e1076:	add    $0xd0,%dil
   e107a:	cmp    $0x9,%dil
   e107e:	ja     e16c7 <sessions::fast::parse_events_avx2+0x2d27>
   e1084:	lea    (%rbx,%rbx,4),%r8d
   e1088:	movzbl %dil,%edi
   e108c:	lea    (%rdi,%r8,2),%ebx
   e1090:	inc    %rdx
   e1093:	cmp    $0x989680,%ebx
   e1099:	jbe    e1069 <sessions::fast::parse_events_avx2+0x26c9>
   e109b:	jmp    e16c7 <sessions::fast::parse_events_avx2+0x2d27>
   e10a0:	mov    %eax,%ecx
   e10a2:	add    $0xfffffffffffffff8,%rax
   e10a6:	lea    0x0(,%rax,8),%edx
   e10ad:	cmp    $0x10,%ecx
   e10b0:	shrx   %rdx,%r9,%rcx
   e10b5:	mov    $0x0,%edx
   e10ba:	cmovae %rdx,%rcx
   e10be:	mov    %eax,%edx
   e10c0:	neg    %dl
   e10c2:	shl    $0x3,%dl
   e10c5:	shlx   %rdx,(%rbx),%rdx
   e10ca:	or     %rdx,%rcx
   e10cd:	xor    %r9,%rcx
   e10d0:	lea    (%rcx,%r8,1),%rsi
   e10d4:	or     %rdx,%rsi
   e10d7:	test   %rdi,%rsi
   e10da:	jne    e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e10e0:	mov    (%rbx,%rax,1),%rax
   e10e4:	mov    %rax,%rdx
   e10e7:	xor    %r9,%rdx
   e10ea:	lea    (%rdx,%r8,1),%rsi
   e10ee:	or     %rax,%rsi
   e10f1:	test   %rdi,%rsi
   e10f4:	jne    e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e10fa:	lea    (%rcx,%rcx,4),%rax
   e10fe:	shr    $0x8,%rcx
   e1102:	lea    (%rcx,%rax,2),%rax
   e1106:	mov    %rax,%rcx
   e1109:	movabs $0xff000000ff,%rsi
   e1113:	and    %rsi,%rcx
   e1116:	movabs $0xf424000000064,%rdi
   e1120:	imul   %rdi,%rcx
   e1124:	shr    $0x10,%rax
   e1128:	and    %rsi,%rax
   e112b:	movabs $0x271000000001,%r8
   e1135:	imul   %r8,%rax
   e1139:	add    %rcx,%rax
   e113c:	shr    $0x20,%rax
   e1140:	lea    (%rdx,%rdx,4),%rcx
   e1144:	shr    $0x8,%rdx
   e1148:	lea    (%rdx,%rcx,2),%rcx
   e114c:	mov    %rcx,%rdx
   e114f:	and    %rsi,%rdx
   e1152:	imul   %rdi,%rdx
   e1156:	shr    $0x10,%rcx
   e115a:	and    %rsi,%rcx
   e115d:	imul   %r8,%rcx
   e1161:	add    %rdx,%rcx
   e1164:	shr    $0x20,%rcx
   e1168:	imul   $0x5f5e100,%rax,%r12
   e116f:	add    %rcx,%r12
   e1172:	mov    %r13,%r9
   e1175:	cmp    %r12,0x938(%r9)
   e117c:	jg     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e1182:	xor    %eax,%eax
   e1184:	cmp    %r12,%rbp
   e1187:	setns  %al
   e118a:	movabs $0x7fffffffffffffff,%rcx
   e1194:	add    %rcx,%rax
   e1197:	sub    %r12,%rbp
   e119a:	cmovo  %rax,%rbp
   e119e:	cmp    0x940(%r9),%r12
   e11a5:	jge    e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e11ab:	cmp    $0x5265c00,%rbp
   e11b2:	jg     e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e11b8:	mov    %r15,0x40(%rsp)
   e11bd:	mov    0x8(%rsp),%rdi
   e11c2:	lea    0x1(%rdi),%eax
   e11c5:	mov    0x68(%rsp),%rsi
   e11ca:	shrx   %rax,%rsi,%rcx
   e11cf:	and    $0x1,%ecx
   e11d2:	lea    (%rdi,%rcx,2),%edx
   e11d5:	inc    %edx
   e11d7:	mov    0x48(%rsp),%rbx
   e11dc:	mov    %ebx,%eax
   e11de:	sub    %edx,%eax
   e11e0:	add    %rdi,%rcx
   e11e3:	inc    %rcx
   e11e6:	mov    0x38(%rsp),%rdx
   e11eb:	mov    (%rdx,%rcx,1),%rcx
   e11ef:	cmp    $0x8,%eax
   e11f2:	jne    e13d2 <sessions::fast::parse_events_avx2+0x2a32>
   e11f8:	movabs $0x6573616863727570,%rdx
   e1202:	cmp    %rdx,%rcx
   e1205:	jne    e13d2 <sessions::fast::parse_events_avx2+0x2a32>
   e120b:	mov    0x20(%rsp),%r13
   e1210:	lea    0x1(%r13),%eax
   e1214:	shrx   %rax,%rsi,%rax
   e1219:	and    $0x1,%eax
   e121c:	lea    0x1(%r13,%rax,2),%ecx
   e1221:	mov    0x60(%rsp),%rdx
   e1226:	cmp    %ecx,%edx
   e1228:	mov    0xa8(%rsp),%r15
   e1230:	je     e17c5 <sessions::fast::parse_events_avx2+0x2e25>
   e1236:	mov    %rdx,%r8
   e1239:	mov    %r9,%rbp
   e123c:	add    %r13d,%eax
   e123f:	inc    %eax
   e1241:	sub    0x30(%rsp),%r13d
   e1246:	sub    %ecx,%r8d
   e1249:	add    0x38(%rsp),%rax
   e124e:	lea    (%rbx,%r14,1),%rcx
   e1252:	inc    %rcx
   e1255:	xor    %ebx,%ebx
   e1257:	xor    %edx,%edx
   e1259:	movabs $0xe7037ed1a0b428db,%r9
   e1263:	cmp    %rdx,%r8
   e1266:	je     e16d4 <sessions::fast::parse_events_avx2+0x2d34>
   e126c:	movzbl (%rax,%rdx,1),%esi
   e1270:	add    $0xd0,%sil
   e1274:	cmp    $0x9,%sil
   e1278:	ja     e17c5 <sessions::fast::parse_events_avx2+0x2e25>
   e127e:	lea    (%rbx,%rbx,4),%edi
   e1281:	movzbl %sil,%esi
   e1285:	lea    (%rsi,%rdi,2),%ebx
   e1288:	inc    %rdx
   e128b:	cmp    $0x989680,%ebx
   e1291:	jbe    e1263 <sessions::fast::parse_events_avx2+0x28c3>
   e1293:	jmp    e17c5 <sessions::fast::parse_events_avx2+0x2e25>
   e1298:	mov    %r14,%r10
   e129b:	mov    %rbp,%r11
   e129e:	jmp    e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e12a3:	cmp    $0x77656976,%ecx
   e12a9:	sete   %dl
   e12ac:	cmp    $0x74726163,%ecx
   e12b2:	sete   %cl
   e12b5:	cmp    $0x4,%eax
   e12b8:	movabs $0xe7037ed1a0b428db,%r9
   e12c2:	jne    e16c7 <sessions::fast::parse_events_avx2+0x2d27>
   e12c8:	xor    %r12d,%r12d
   e12cb:	or     %cl,%dl
   e12cd:	je     e16c7 <sessions::fast::parse_events_avx2+0x2d27>
   e12d3:	mov    0x8(%rsp),%rax
   e12d8:	mov    0x38(%rsp),%rcx
   e12dd:	add    %ecx,%eax
   e12df:	inc    %eax
   e12e1:	add    %rax,%r13
   e12e4:	mov    0x50(%rsp),%rax
   e12e9:	sub    0x948(%rax),%r14d
   e12f0:	mov    0xf0(%rsp),%rbx
   e12f8:	mov    0x100(%rsp),%rdi
   e1300:	mov    0x108(%rsp),%rax
   e1308:	mov    %rax,0x38(%rsp)
   e130d:	mov    0x48(%rsp),%r8
   e1312:	cmp    $0xc,%r8d
   e1316:	jae    e14dd <sessions::fast::parse_events_avx2+0x2b3d>
   e131c:	mov    %r8,%rax
   e131f:	shl    $0x4,%rax
   e1323:	mov    0x0(%r13),%rcx
   e1327:	mov    0x8(%r13),%rdx
   e132b:	lea    -0xc74fa(%rip),%rsi        # 19e38 <sessions::fast::ids::MASKS>
   e1332:	and    (%rax,%rsi,1),%rcx
   e1336:	and    0x8(%rax,%rsi,1),%rdx
   e133b:	shl    $0x38,%r8
   e133f:	or     %rdx,%r8
   e1342:	mov    %rcx,%r13
   e1345:	movabs $0xa0761d6478bd642f,%rax
   e134f:	xor    %rax,%rcx
   e1352:	mov    %r8,%rdx
   e1355:	xor    %r9,%rdx
   e1358:	mulx   %rcx,%rax,%r9
   e135d:	mov    %r8,%rdx
   e1360:	xor    %rax,%r9
   e1363:	mov    0x98(%rdi),%rax
   e136a:	mov    0xa0(%rdi),%rcx
   e1371:	and    %r9,%rcx
   e1374:	shl    $0x4,%rcx
   e1378:	prefetcht0 (%rax,%rcx,1)
   e137c:	xor    %r8d,%r8d
   e137f:	jmp    e190c <sessions::fast::parse_events_avx2+0x2f6c>
   e1384:	mov    0x80(%rsp),%r13
   e138c:	mov    %r13,%rdi
   e138f:	mov    0x28(%rsp),%rsi
   e1394:	mov    0xd0(%rsp),%r14
   e139c:	mov    %r14,%rdx
   e139f:	lea    0xe8(%rsp),%rcx
   e13a7:	vzeroupper
   e13aa:	call   71100 <sessions::fast::scan::spill::<7, sessions::fast::EventLines<sessions::fast::scan::Avx2>>>
   e13af:	vpbroadcastb -0xd05f0(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e13b8:	vpbroadcastb -0xd05fa(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e13c1:	vpbroadcastb -0xd0604(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e13ca:	mov    %rax,%rbp
   e13cd:	jmp    deac0 <sessions::fast::parse_events_avx2+0x120>
   e13d2:	mov    %r9,%rbp
   e13d5:	cmp    $0x77656976,%ecx
   e13db:	sete   %dl
   e13de:	cmp    $0x74726163,%ecx
   e13e4:	sete   %cl
   e13e7:	cmp    $0x4,%eax
   e13ea:	movabs $0xe7037ed1a0b428db,%r9
   e13f4:	mov    0xa8(%rsp),%r15
   e13fc:	mov    0x50(%rsp),%rsi
   e1401:	jne    e17c5 <sessions::fast::parse_events_avx2+0x2e25>
   e1407:	xor    %r13d,%r13d
   e140a:	or     %cl,%dl
   e140c:	je     e17c5 <sessions::fast::parse_events_avx2+0x2e25>
   e1412:	mov    0x70(%rsp),%rax
   e1417:	add    %esi,%eax
   e1419:	inc    %eax
   e141b:	add    %rax,%r15
   e141e:	sub    0x948(%rbp),%r12d
   e1425:	mov    0xf0(%rsp),%r14
   e142d:	mov    0x100(%rsp),%rdi
   e1435:	mov    0x108(%rsp),%rbp
   e143d:	mov    0x88(%rsp),%r8
   e1445:	cmp    $0xc,%r8d
   e1449:	jae    e1558 <sessions::fast::parse_events_avx2+0x2bb8>
   e144f:	mov    %r8,%rax
   e1452:	shl    $0x4,%rax
   e1456:	mov    (%r15),%rcx
   e1459:	mov    0x8(%r15),%rdx
   e145d:	lea    -0xc762c(%rip),%rsi        # 19e38 <sessions::fast::ids::MASKS>
   e1464:	and    (%rax,%rsi,1),%rcx
   e1468:	and    0x8(%rax,%rsi,1),%rdx
   e146d:	shl    $0x38,%r8
   e1471:	or     %rdx,%r8
   e1474:	mov    %rcx,0xa8(%rsp)
   e147c:	movabs $0xa0761d6478bd642f,%rax
   e1486:	xor    %rax,%rcx
   e1489:	mov    %r8,%rdx
   e148c:	xor    %r9,%rdx
   e148f:	mulx   %rcx,%rax,%r15
   e1494:	mov    %r8,%rbx
   e1497:	xor    %rax,%r15
   e149a:	mov    0x98(%rdi),%rax
   e14a1:	mov    0xa0(%rdi),%rcx
   e14a8:	and    %r15,%rcx
   e14ab:	shl    $0x4,%rcx
   e14af:	prefetcht0 (%rax,%rcx,1)
   e14b3:	xor    %r8d,%r8d
   e14b6:	mov    0x10(%rsp),%r9
   e14bb:	jmp    e1cad <sessions::fast::parse_events_avx2+0x330d>
   e14c0:	mov    %r12,%r10
   e14c3:	mov    %rbp,%r12
   e14c6:	mov    0x90(%rsp),%rbp
   e14ce:	jmp    e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e14d3:	mov    0x58(%rsp),%r10
   e14d8:	jmp    e2d2b <sessions::fast::parse_events_avx2+0x438b>
   e14dd:	mov    %r8,%rdx
   e14e0:	movabs $0x589965cc75374cc3,%rax
   e14ea:	imul   %rax,%rdx
   e14ee:	movabs $0x8ebc6af09c88c6e3,%rax
   e14f8:	xor    %rax,%rdx
   e14fb:	lea    -0x8(%r8),%rsi
   e14ff:	shr    $0x3,%rsi
   e1503:	je     e18a7 <sessions::fast::parse_events_avx2+0x2f07>
   e1509:	mov    %rdi,%r15
   e150c:	inc    %rsi
   e150f:	mov    %rsi,%rdi
   e1512:	and    $0xfffffffffffffffe,%rdi
   e1516:	mov    $0x8,%ecx
   e151b:	mov    %rcx,%rax
   e151e:	xor    -0x8(%r13,%rcx,1),%rdx
   e1523:	mulx   %r9,%rcx,%rdx
   e1528:	xor    %rcx,%rdx
   e152b:	xor    0x0(%r13,%rax,1),%rdx
   e1530:	mulx   %r9,%rcx,%rdx
   e1535:	xor    %rcx,%rdx
   e1538:	lea    0x10(%rax),%rcx
   e153c:	add    $0xfffffffffffffffe,%rdi
   e1540:	jne    e151b <sessions::fast::parse_events_avx2+0x2b7b>
   e1542:	add    $0x8,%rax
   e1546:	test   $0x1,%sil
   e154a:	mov    %r15,%rdi
   e154d:	jne    e18ae <sessions::fast::parse_events_avx2+0x2f0e>
   e1553:	jmp    e18be <sessions::fast::parse_events_avx2+0x2f1e>
   e1558:	mov    %r8,%rdx
   e155b:	movabs $0x589965cc75374cc3,%rax
   e1565:	imul   %rax,%rdx
   e1569:	movabs $0x8ebc6af09c88c6e3,%rax
   e1573:	xor    %rax,%rdx
   e1576:	lea    -0x8(%r8),%rsi
   e157a:	shr    $0x3,%rsi
   e157e:	je     e1c3d <sessions::fast::parse_events_avx2+0x329d>
   e1584:	mov    %rdi,%rbx
   e1587:	inc    %rsi
   e158a:	mov    %rsi,%rdi
   e158d:	and    $0xfffffffffffffffe,%rdi
   e1591:	mov    $0x8,%ecx
   e1596:	mov    %rcx,%rax
   e1599:	xor    -0x8(%r15,%rcx,1),%rdx
   e159e:	mulx   %r9,%rcx,%rdx
   e15a3:	xor    %rcx,%rdx
   e15a6:	xor    (%r15,%rax,1),%rdx
   e15aa:	mulx   %r9,%rcx,%rdx
   e15af:	xor    %rcx,%rdx
   e15b2:	lea    0x10(%rax),%rcx
   e15b6:	add    $0xfffffffffffffffe,%rdi
   e15ba:	jne    e1596 <sessions::fast::parse_events_avx2+0x2bf6>
   e15bc:	add    $0x8,%rax
   e15c0:	test   $0x1,%sil
   e15c4:	mov    %rbx,%rdi
   e15c7:	jne    e1c44 <sessions::fast::parse_events_avx2+0x32a4>
   e15cd:	jmp    e1c53 <sessions::fast::parse_events_avx2+0x32b3>
   e15d2:	test   %ebx,%ebx
   e15d4:	je     e16c7 <sessions::fast::parse_events_avx2+0x2d27>
   e15da:	cmp    $0xc,%r15d
   e15de:	jae    e2e60 <sessions::fast::parse_events_avx2+0x44c0>
   e15e4:	mov    %r15,%rcx
   e15e7:	shl    $0x4,%rcx
   e15eb:	mov    0x0(%r13,%rsi,1),%rax
   e15f0:	mov    0x8(%r13,%rsi,1),%rdx
   e15f5:	lea    -0xc77c4(%rip),%rsi        # 19e38 <sessions::fast::ids::MASKS>
   e15fc:	and    (%rcx,%rsi,1),%rax
   e1600:	and    0x8(%rcx,%rsi,1),%rdx
   e1605:	shl    $0x38,%r15
   e1609:	or     %rdx,%r15
   e160c:	mov    %rax,%rcx
   e160f:	movabs $0xa0761d6478bd642f,%rdx
   e1619:	xor    %rdx,%rcx
   e161c:	mov    %r15,%rdx
   e161f:	xor    %r9,%rdx
   e1622:	mulx   %rcx,%rcx,%rdi
   e1627:	xor    %rcx,%rdi
   e162a:	mov    0x50(%rsp),%rdx
   e162f:	mov    0x8(%rdx),%rcx
   e1633:	mov    0x48(%rdx),%rdx
   e1637:	and    %rdx,%rdi
   e163a:	mov    %rdi,%rsi
   e163d:	shl    $0x4,%rsi
   e1641:	mov    0x8(%rcx,%rsi,1),%r8
   e1646:	xor    %r15,%r8
   e1649:	mov    (%rcx,%rsi,1),%rsi
   e164d:	xor    %rax,%rsi
   e1650:	or     %r8,%rsi
   e1653:	je     e168c <sessions::fast::parse_events_avx2+0x2cec>
   e1655:	mov    %r15,%r12
   e1658:	mov    %rdi,%rsi
   e165b:	shl    $0x4,%rsi
   e165f:	cmpq   $0x0,0x8(%rcx,%rsi,1)
   e1665:	je     e2352 <sessions::fast::parse_events_avx2+0x39b2>
   e166b:	inc    %rdi
   e166e:	and    %rdx,%rdi
   e1671:	mov    %rdi,%rsi
   e1674:	shl    $0x4,%rsi
   e1678:	mov    0x8(%rcx,%rsi,1),%r8
   e167d:	xor    %r12,%r8
   e1680:	mov    (%rcx,%rsi,1),%rsi
   e1684:	xor    %rax,%rsi
   e1687:	or     %r8,%rsi
   e168a:	jne    e1658 <sessions::fast::parse_events_avx2+0x2cb8>
   e168c:	mov    0x50(%rsp),%rax
   e1691:	mov    0x28(%rax),%rsi
   e1695:	cmp    %rsi,%rdi
   e1698:	jae    e76f0 <sessions::fast::parse_events_avx2+0x8d50>
   e169e:	mov    0x20(%rax),%rax
   e16a2:	mov    (%rax,%rdi,4),%r12d
   e16a6:	mov    $0x1,%eax
   e16ab:	test   $0x1,%al
   e16ad:	jne    e16bb <sessions::fast::parse_events_avx2+0x2d1b>
   e16af:	mov    0x50(%rsp),%rax
   e16b4:	mov    0x9a0(%rax),%r12d
   e16bb:	shl    $0x18,%r12d
   e16bf:	or     %ebx,%r12d
   e16c2:	jmp    e12d3 <sessions::fast::parse_events_avx2+0x2933>
   e16c7:	mov    0x98(%rsp),%r12
   e16cf:	jmp    e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e16d4:	test   %ebx,%ebx
   e16d6:	je     e17c5 <sessions::fast::parse_events_avx2+0x2e25>
   e16dc:	mov    %r13,%rdx
   e16df:	cmp    $0xc,%edx
   e16e2:	jae    e2ebe <sessions::fast::parse_events_avx2+0x451e>
   e16e8:	mov    %rdx,%r14
   e16eb:	shl    $0x4,%rdx
   e16ef:	mov    0x38(%rsp),%rsi
   e16f4:	mov    (%rsi,%rcx,1),%rax
   e16f8:	mov    0x8(%rsi,%rcx,1),%rcx
   e16fd:	lea    -0xc78cc(%rip),%rsi        # 19e38 <sessions::fast::ids::MASKS>
   e1704:	and    (%rdx,%rsi,1),%rax
   e1708:	and    0x8(%rdx,%rsi,1),%rcx
   e170d:	shl    $0x38,%r14
   e1711:	or     %rcx,%r14
   e1714:	mov    %rax,%rcx
   e1717:	movabs $0xa0761d6478bd642f,%rdx
   e1721:	xor    %rdx,%rcx
   e1724:	mov    %r14,%rdx
   e1727:	xor    %r9,%rdx
   e172a:	mulx   %rcx,%rcx,%rdi
   e172f:	xor    %rcx,%rdi
   e1732:	mov    0x8(%rbp),%rcx
   e1736:	mov    0x48(%rbp),%rdx
   e173a:	and    %rdx,%rdi
   e173d:	mov    %rdi,%rsi
   e1740:	shl    $0x4,%rsi
   e1744:	mov    0x8(%rcx,%rsi,1),%r8
   e1749:	xor    %r14,%r8
   e174c:	mov    (%rcx,%rsi,1),%rsi
   e1750:	xor    %rax,%rsi
   e1753:	or     %r8,%rsi
   e1756:	je     e178f <sessions::fast::parse_events_avx2+0x2def>
   e1758:	mov    %r14,%r13
   e175b:	mov    %rdi,%rsi
   e175e:	shl    $0x4,%rsi
   e1762:	cmpq   $0x0,0x8(%rcx,%rsi,1)
   e1768:	je     e2495 <sessions::fast::parse_events_avx2+0x3af5>
   e176e:	inc    %rdi
   e1771:	and    %rdx,%rdi
   e1774:	mov    %rdi,%rsi
   e1777:	shl    $0x4,%rsi
   e177b:	mov    0x8(%rcx,%rsi,1),%r8
   e1780:	xor    %r13,%r8
   e1783:	mov    (%rcx,%rsi,1),%rsi
   e1787:	xor    %rax,%rsi
   e178a:	or     %r8,%rsi
   e178d:	jne    e175b <sessions::fast::parse_events_avx2+0x2dbb>
   e178f:	mov    0x28(%rbp),%rsi
   e1793:	cmp    %rsi,%rdi
   e1796:	jae    e76f0 <sessions::fast::parse_events_avx2+0x8d50>
   e179c:	mov    0x20(%rbp),%rax
   e17a0:	mov    (%rax,%rdi,4),%r13d
   e17a4:	mov    $0x1,%eax
   e17a9:	mov    0x50(%rsp),%rsi
   e17ae:	test   $0x1,%al
   e17b0:	jne    e17b9 <sessions::fast::parse_events_avx2+0x2e19>
   e17b2:	mov    0x9a0(%rbp),%r13d
   e17b9:	shl    $0x18,%r13d
   e17bd:	or     %ebx,%r13d
   e17c0:	jmp    e1412 <sessions::fast::parse_events_avx2+0x2a72>
   e17c5:	mov    0x40(%rsp),%r15
   e17ca:	mov    0xf0(%rsp),%rsi
   e17d2:	mov    0x108(%rsp),%rbx
   e17da:	mov    0x68(%rbx),%rax
   e17de:	movzbl (%rax,%r11,1),%edx
   e17e3:	mov    %r11,%r14
   e17e6:	shl    $0x6,%r14
   e17ea:	add    0x50(%rbx),%r14
   e17ee:	lea    0x1(%rdx),%rcx
   e17f2:	shl    $0x5,%edx
   e17f5:	mov    %r15,(%rdx,%r14,1)
   e17f9:	mov    %r10,0x8(%rdx,%r14,1)
   e17fe:	movabs $0xffffffff00000000,%rdi
   e1808:	mov    %rdi,0x10(%rdx,%r14,1)
   e180d:	movl   $0x0,0x18(%rdx,%r14,1)
   e1816:	mov    0x10(%rsp),%rdi
   e181b:	mov    %edi,0x1c(%rdx,%r14,1)
   e1820:	cmp    $0x2,%rcx
   e1824:	jne    e187b <sessions::fast::parse_events_avx2+0x2edb>
   e1826:	movb   $0x0,(%rax,%r11,1)
   e182b:	mov    0x8(%rbx),%rax
   e182f:	mov    0x20(%rbx),%rdx
   e1833:	mov    (%rax,%r11,8),%rcx
   e1837:	cmp    (%rdx,%r11,8),%rcx
   e183b:	je     e1c01 <sessions::fast::parse_events_avx2+0x3261>
   e1841:	vmovaps (%r14),%xmm0
   e1846:	movntdq %xmm0,(%rcx)
   e184a:	lea    0x10(%rcx),%rdx
   e184e:	vmovaps 0x10(%r14),%xmm0
   e1854:	movntdq %xmm0,(%rdx)
   e1858:	lea    0x20(%rcx),%rdx
   e185c:	vmovaps 0x20(%r14),%xmm0
   e1862:	movntdq %xmm0,(%rdx)
   e1866:	add    $0x30,%rcx
   e186a:	vmovdqa 0x30(%r14),%xmm0
   e1870:	movntdq %xmm0,(%rcx)
   e1874:	addq   $0x40,(%rax,%r11,8)
   e1879:	jmp    e1880 <sessions::fast::parse_events_avx2+0x2ee0>
   e187b:	mov    %cl,(%rax,%r11,1)
   e187f:	nop
   e1880:	mov    0x98(%rsp),%eax
   e1887:	mov    0x28(%rsp),%rbp
   e188c:	add    %rax,%rbp
   e188f:	inc    %rbp
   e1892:	mov    0x80(%rsp),%r13
   e189a:	mov    0xd0(%rsp),%r14
   e18a2:	jmp    deac0 <sessions::fast::parse_events_avx2+0x120>
   e18a7:	mov    $0x8,%ecx
   e18ac:	xor    %eax,%eax
   e18ae:	xor    0x0(%r13,%rax,1),%rdx
   e18b3:	mulx   %r9,%rax,%rdx
   e18b8:	xor    %rax,%rdx
   e18bb:	mov    %rcx,%rax
   e18be:	cmp    %r8,%rax
   e18c1:	je     e18df <sessions::fast::parse_events_avx2+0x2f3f>
   e18c3:	mov    %r8d,%ecx
   e18c6:	neg    %ecx
   e18c8:	shl    $0x3,%ecx
   e18cb:	and    $0x38,%cl
   e18ce:	mov    $0x40,%esi
   e18d3:	sub    %ecx,%esi
   e18d5:	bzhi   %rsi,0x0(%r13,%rax,1),%rax
   e18dc:	xor    %rax,%rdx
   e18df:	movabs $0xa0761d6478bd642f,%rax
   e18e9:	mulx   %rax,%rax,%r9
   e18ee:	xor    %rax,%r9
   e18f1:	mov    0xa8(%rdi),%rax
   e18f8:	mov    0xb0(%rdi),%rcx
   e18ff:	and    %r9,%rcx
   e1902:	shl    $0x6,%rcx
   e1906:	prefetcht0 (%rax,%rcx,1)
   e190a:	xor    %edx,%edx
   e190c:	mov    0x510(%rsp),%r15
   e1914:	mov    %r15d,%esi
   e1917:	and    $0xf,%esi
   e191a:	cmp    $0x10,%r15
   e191e:	jb     e27e2 <sessions::fast::parse_events_avx2+0x3e42>
   e1924:	mov    %r15,0x70(%rsp)
   e1929:	mov    %rdx,0x18(%rsp)
   e192e:	mov    %rbx,0xe0(%rsp)
   e1936:	mov    %r8,0x48(%rsp)
   e193b:	mov    %esi,%eax
   e193d:	shl    $0x4,%eax
   e1940:	lea    0x310(%rsp),%rcx
   e1948:	mov    (%rcx,%rax,1),%rcx
   e194c:	mov    %rcx,0x40(%rsp)
   e1951:	mov    0x410(%rsp,%rsi,8),%r8
   e1959:	mov    %rsi,0x8(%rsp)
   e195e:	mov    0x4d0(%rsp,%rsi,4),%r15d
   e1966:	test   %r15,%r15
   e1969:	mov    %r8,0x50(%rsp)
   e196e:	mov    %rdi,0x30(%rsp)
   e1973:	je     e1b25 <sessions::fast::parse_events_avx2+0x3185>
   e1979:	mov    %r9,0xa0(%rsp)
   e1981:	mov    %r12d,0x78(%rsp)
   e1986:	mov    0xa8(%rdi),%rax
   e198d:	mov    %rax,0x20(%rsp)
   e1992:	mov    0xb0(%rdi),%rax
   e1999:	mov    %rax,0x88(%rsp)
   e19a1:	mov    %r8,%r12
   e19a4:	mov    %rbp,0x90(%rsp)
   e19ac:	mov    %r13,0xa8(%rsp)
   e19b4:	jmp    e19ca <sessions::fast::parse_events_avx2+0x302a>
   e19b6:	inc    %r12
   e19b9:	cmpq   $0x0,0x68(%rsp)
   e19bf:	mov    0x50(%rsp),%r8
   e19c4:	je     e209a <sessions::fast::parse_events_avx2+0x36fa>
   e19ca:	and    0x88(%rsp),%r12
   e19d2:	mov    %r12,%rax
   e19d5:	shl    $0x6,%rax
   e19d9:	mov    0x20(%rsp),%rdx
   e19de:	lea    (%rdx,%rax,1),%rbx
   e19e2:	mov    0x8(%rdx,%rax,1),%rcx
   e19e7:	mov    %rcx,0x68(%rsp)
   e19ec:	cmp    %r8,(%rdx,%rax,1)
   e19f0:	jne    e19b6 <sessions::fast::parse_events_avx2+0x3016>
   e19f2:	cmp    0x68(%rsp),%r15d
   e19f7:	jne    e19b6 <sessions::fast::parse_events_avx2+0x3016>
   e19f9:	cmp    $0x30,%r15d
   e19fd:	jbe    e1a76 <sessions::fast::parse_events_avx2+0x30d6>
   e19ff:	mov    0x10(%rbx),%rax
   e1a03:	mov    $0x30,%cl
   e1a05:	bzhi   %rcx,%rax,%rdi
   e1a0a:	shr    $0x30,%rax
   e1a0e:	and    $0xff,%rax
   e1a14:	jne    e1a1c <sessions::fast::parse_events_avx2+0x307c>
   e1a16:	mov    (%rdi),%eax
   e1a18:	add    $0x8,%rdi
   e1a1c:	cmp    %r15d,%eax
   e1a1f:	jne    e19b6 <sessions::fast::parse_events_avx2+0x3016>
   e1a21:	mov    0x40(%rsp),%rsi
   e1a26:	mov    %r15,%rdx
   e1a29:	mov    %r10,%rbp
   e1a2c:	mov    %r11,%r13
   e1a2f:	vzeroupper
   e1a32:	call   *0x1a7c00(%rip)        # 289638 <_GLOBAL_OFFSET_TABLE_+0x20>
   e1a38:	mov    %r13,%r11
   e1a3b:	mov    %rbp,%r10
   e1a3e:	mov    0x90(%rsp),%rbp
   e1a46:	mov    0xa8(%rsp),%r13
   e1a4e:	vpbroadcastb -0xd0c8f(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e1a57:	vpbroadcastb -0xd0c99(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e1a60:	vpbroadcastb -0xd0ca3(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e1a69:	test   %eax,%eax
   e1a6b:	jne    e19b6 <sessions::fast::parse_events_avx2+0x3016>
   e1a71:	jmp    e1af8 <sessions::fast::parse_events_avx2+0x3158>
   e1a76:	mov    %r15,%rax
   e1a79:	lea    0x0(,%r15,8),%rcx
   e1a81:	xor    %edx,%edx
   e1a83:	mov    $0xffffffffffffffff,%rsi
   e1a8a:	shld   %cl,%rsi,%rsi
   e1a8e:	mov    $0xffffffffffffffff,%r9
   e1a95:	shlx   %rcx,%r9,%rdi
   e1a9a:	test   $0x40,%cl
   e1a9d:	cmovne %rdi,%rsi
   e1aa1:	mov    $0x0,%r8d
   e1aa7:	cmove  %rdi,%r8
   e1aab:	vmovdqu 0x10(%rbx,%rdx,1),%xmm0
   e1ab1:	cmp    $0x10,%rax
   e1ab5:	not    %rsi
   e1ab8:	not    %r8
   e1abb:	cmovae %r9,%rsi
   e1abf:	cmovae %r9,%r8
   e1ac3:	mov    0x40(%rsp),%rdi
   e1ac8:	vpxor  (%rdi,%rdx,1),%xmm0,%xmm0
   e1acd:	vmovq  %xmm0,%rdi
   e1ad2:	and    %r8,%rdi
   e1ad5:	vpextrq $0x1,%xmm0,%r8
   e1adb:	and    %rsi,%r8
   e1ade:	or     %rdi,%r8
   e1ae1:	jne    e19b6 <sessions::fast::parse_events_avx2+0x3016>
   e1ae7:	add    $0x10,%rdx
   e1aeb:	add    $0xffffffffffffff80,%rcx
   e1aef:	add    $0xfffffffffffffff0,%rax
   e1af3:	cmp    %r15,%rdx
   e1af6:	jb     e1a83 <sessions::fast::parse_events_avx2+0x30e3>
   e1af8:	mov    0x68(%rsp),%r11
   e1afd:	shr    $0x20,%r11
   e1b01:	lea    0x110(%rsp),%r8
   e1b09:	mov    0x78(%rsp),%r12d
   e1b0e:	mov    0x38(%rsp),%rdi
   e1b13:	mov    0xa0(%rsp),%r9
   e1b1b:	mov    0x8(%rsp),%rax
   e1b20:	jmp    e273b <sessions::fast::parse_events_avx2+0x3d9b>
   e1b25:	lea    0x310(%rsp),%rcx
   e1b2d:	mov    0x8(%rcx,%rax,1),%rbx
   e1b32:	mov    0x98(%rdi),%rax
   e1b39:	mov    0xa0(%rdi),%rcx
   e1b40:	mov    %r8,%rdx
   e1b43:	and    %rcx,%rdx
   e1b46:	mov    %rdx,%r8
   e1b49:	shl    $0x4,%r8
   e1b4d:	lea    (%rax,%r8,1),%rsi
   e1b51:	mov    0x8(%rax,%r8,1),%r11
   e1b56:	movabs $0xff00000000000000,%rdi
   e1b60:	add    $0xffffff,%rdi
   e1b67:	mov    0x40(%rsp),%r15
   e1b6c:	cmp    %r15,(%rax,%r8,1)
   e1b70:	jne    e1b81 <sessions::fast::parse_events_avx2+0x31e1>
   e1b72:	mov    %r11,%r8
   e1b75:	and    %rdi,%r8
   e1b78:	cmp    %rbx,%r8
   e1b7b:	je     e1f06 <sessions::fast::parse_events_avx2+0x3566>
   e1b81:	test   %r11,%r11
   e1b84:	je     e2162 <sessions::fast::parse_events_avx2+0x37c2>
   e1b8a:	inc    %rdx
   e1b8d:	and    %rcx,%rdx
   e1b90:	mov    %rdx,%r8
   e1b93:	shl    $0x4,%r8
   e1b97:	lea    (%rax,%r8,1),%rsi
   e1b9b:	mov    0x8(%rax,%r8,1),%r11
   e1ba0:	cmp    %r15,(%rax,%r8,1)
   e1ba4:	je     e1b72 <sessions::fast::parse_events_avx2+0x31d2>
   e1ba6:	jmp    e1b81 <sessions::fast::parse_events_avx2+0x31e1>
   e1ba8:	mov    %r11,%rdi
   e1bab:	mov    %rbp,%rsi
   e1bae:	mov    %r10,0xd8(%rsp)
   e1bb6:	mov    %r13,0x78(%rsp)
   e1bbb:	mov    %r11,%r13
   e1bbe:	vzeroupper
   e1bc1:	call   c6020 <<sessions::fast::ids::Bytes>::refill>
   e1bc6:	mov    0x50(%rsp),%r9
   e1bcb:	mov    %r13,%r11
   e1bce:	mov    0x78(%rsp),%r13
   e1bd3:	mov    %r15,%r8
   e1bd6:	mov    0xd8(%rsp),%r10
   e1bde:	vpbroadcastb -0xd0e1f(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e1be7:	vpbroadcastb -0xd0e29(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e1bf0:	vpbroadcastb -0xd0e33(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e1bf9:	mov    (%r11),%rdx
   e1bfc:	jmp    df38a <sessions::fast::parse_events_avx2+0x9ea>
   e1c01:	mov    %rbx,%rdi
   e1c04:	mov    %r11,%rdx
   e1c07:	mov    %r11,%r15
   e1c0a:	vzeroupper
   e1c0d:	call   b1b20 <<sessions::fast::sink::Sink<sessions::fast::ClickRec>>::refill>
   e1c12:	mov    %r15,%r11
   e1c15:	vpbroadcastb -0xd0e56(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e1c1e:	vpbroadcastb -0xd0e60(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e1c27:	vpbroadcastb -0xd0e6a(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e1c30:	mov    0x8(%rbx),%rax
   e1c34:	mov    (%rax,%r15,8),%rcx
   e1c38:	jmp    e1841 <sessions::fast::parse_events_avx2+0x2ea1>
   e1c3d:	mov    $0x8,%ecx
   e1c42:	xor    %eax,%eax
   e1c44:	xor    (%r15,%rax,1),%rdx
   e1c48:	mulx   %r9,%rax,%rdx
   e1c4d:	xor    %rax,%rdx
   e1c50:	mov    %rcx,%rax
   e1c53:	cmp    %r8,%rax
   e1c56:	je     e1c73 <sessions::fast::parse_events_avx2+0x32d3>
   e1c58:	mov    %r8d,%ecx
   e1c5b:	neg    %ecx
   e1c5d:	shl    $0x3,%ecx
   e1c60:	and    $0x38,%cl
   e1c63:	mov    $0x40,%esi
   e1c68:	sub    %ecx,%esi
   e1c6a:	bzhi   %rsi,(%r15,%rax,1),%rax
   e1c70:	xor    %rax,%rdx
   e1c73:	mov    0x10(%rsp),%r9
   e1c78:	mov    %r15,0xa8(%rsp)
   e1c80:	movabs $0xa0761d6478bd642f,%rax
   e1c8a:	mulx   %rax,%rax,%r15
   e1c8f:	xor    %rax,%r15
   e1c92:	mov    0xa8(%rdi),%rax
   e1c99:	mov    0xb0(%rdi),%rcx
   e1ca0:	and    %r15,%rcx
   e1ca3:	shl    $0x6,%rcx
   e1ca7:	prefetcht0 (%rax,%rcx,1)
   e1cab:	xor    %ebx,%ebx
   e1cad:	mov    0x510(%rsp),%rax
   e1cb5:	mov    %eax,%esi
   e1cb7:	and    $0xf,%esi
   e1cba:	cmp    $0x10,%rax
   e1cbe:	jb     e2b14 <sessions::fast::parse_events_avx2+0x4174>
   e1cc4:	mov    %r15,0x38(%rsp)
   e1cc9:	mov    %rbx,0x8(%rsp)
   e1cce:	mov    %r8,0x88(%rsp)
   e1cd6:	mov    %esi,%eax
   e1cd8:	shl    $0x4,%eax
   e1cdb:	lea    0x310(%rsp),%rcx
   e1ce3:	mov    (%rcx,%rax,1),%rcx
   e1ce7:	mov    %rcx,0x60(%rsp)
   e1cec:	mov    0x410(%rsp,%rsi,8),%r8
   e1cf4:	mov    %rsi,0x50(%rsp)
   e1cf9:	mov    0x4d0(%rsp,%rsi,4),%ebx
   e1d00:	test   %rbx,%rbx
   e1d03:	mov    %r8,0x48(%rsp)
   e1d08:	mov    %rbp,0x20(%rsp)
   e1d0d:	mov    %r14,0x30(%rsp)
   e1d12:	mov    %rdi,0x18(%rsp)
   e1d17:	je     e1e7e <sessions::fast::parse_events_avx2+0x34de>
   e1d1d:	mov    %r13d,0x70(%rsp)
   e1d22:	mov    0xa8(%rdi),%r14
   e1d29:	mov    0xb0(%rdi),%rax
   e1d30:	mov    %rax,0x68(%rsp)
   e1d35:	mov    %r8,%r13
   e1d38:	mov    %r10,0x58(%rsp)
   e1d3d:	mov    %r11,0x90(%rsp)
   e1d45:	jmp    e1d58 <sessions::fast::parse_events_avx2+0x33b8>
   e1d47:	inc    %r13
   e1d4a:	test   %rbp,%rbp
   e1d4d:	mov    0x48(%rsp),%r8
   e1d52:	je     e2361 <sessions::fast::parse_events_avx2+0x39c1>
   e1d58:	and    0x68(%rsp),%r13
   e1d5d:	mov    %r13,%rax
   e1d60:	shl    $0x6,%rax
   e1d64:	lea    (%r14,%rax,1),%r15
   e1d68:	mov    0x8(%r14,%rax,1),%rbp
   e1d6d:	cmp    %r8,(%r14,%rax,1)
   e1d71:	jne    e1d47 <sessions::fast::parse_events_avx2+0x33a7>
   e1d73:	cmp    %ebp,%ebx
   e1d75:	jne    e1d47 <sessions::fast::parse_events_avx2+0x33a7>
   e1d77:	cmp    $0x30,%ebx
   e1d7a:	jbe    e1de3 <sessions::fast::parse_events_avx2+0x3443>
   e1d7c:	mov    0x10(%r15),%rax
   e1d80:	mov    $0x30,%cl
   e1d82:	bzhi   %rcx,%rax,%rdi
   e1d87:	shr    $0x30,%rax
   e1d8b:	and    $0xff,%rax
   e1d91:	jne    e1d99 <sessions::fast::parse_events_avx2+0x33f9>
   e1d93:	mov    (%rdi),%eax
   e1d95:	add    $0x8,%rdi
   e1d99:	cmp    %ebx,%eax
   e1d9b:	jne    e1d47 <sessions::fast::parse_events_avx2+0x33a7>
   e1d9d:	mov    0x60(%rsp),%rsi
   e1da2:	mov    %rbx,%rdx
   e1da5:	vzeroupper
   e1da8:	call   *0x1a788a(%rip)        # 289638 <_GLOBAL_OFFSET_TABLE_+0x20>
   e1dae:	mov    0x90(%rsp),%r11
   e1db6:	mov    0x58(%rsp),%r10
   e1dbb:	vpbroadcastb -0xd0ffc(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e1dc4:	vpbroadcastb -0xd1006(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e1dcd:	vpbroadcastb -0xd1010(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e1dd6:	test   %eax,%eax
   e1dd8:	jne    e1d47 <sessions::fast::parse_events_avx2+0x33a7>
   e1dde:	jmp    e1e66 <sessions::fast::parse_events_avx2+0x34c6>
   e1de3:	mov    %rbx,%rax
   e1de6:	lea    0x0(,%rbx,8),%rcx
   e1dee:	xor    %edx,%edx
   e1df0:	mov    $0xffffffffffffffff,%rsi
   e1df7:	shld   %cl,%rsi,%rsi
   e1dfb:	mov    $0xffffffffffffffff,%r9
   e1e02:	shlx   %rcx,%r9,%rdi
   e1e07:	test   $0x40,%cl
   e1e0a:	cmovne %rdi,%rsi
   e1e0e:	mov    $0x0,%r8d
   e1e14:	cmove  %rdi,%r8
   e1e18:	vmovdqu 0x10(%r15,%rdx,1),%xmm0
   e1e1f:	cmp    $0x10,%rax
   e1e23:	not    %rsi
   e1e26:	not    %r8
   e1e29:	cmovae %r9,%rsi
   e1e2d:	cmovae %r9,%r8
   e1e31:	mov    0x60(%rsp),%rdi
   e1e36:	vpxor  (%rdi,%rdx,1),%xmm0,%xmm0
   e1e3b:	vmovq  %xmm0,%rdi
   e1e40:	and    %r8,%rdi
   e1e43:	vpextrq $0x1,%xmm0,%r8
   e1e49:	and    %rsi,%r8
   e1e4c:	or     %rdi,%r8
   e1e4f:	jne    e1d47 <sessions::fast::parse_events_avx2+0x33a7>
   e1e55:	add    $0x10,%rdx
   e1e59:	add    $0xffffffffffffff80,%rcx
   e1e5d:	add    $0xfffffffffffffff0,%rax
   e1e61:	cmp    %rbx,%rdx
   e1e64:	jb     e1df0 <sessions::fast::parse_events_avx2+0x3450>
   e1e66:	shr    $0x20,%rbp
   e1e6a:	mov    0x10(%rsp),%r9
   e1e6f:	mov    0x70(%rsp),%r13d
   e1e74:	mov    0x38(%rsp),%r15
   e1e79:	jmp    e2a4f <sessions::fast::parse_events_avx2+0x40af>
   e1e7e:	lea    0x310(%rsp),%rcx
   e1e86:	mov    0x8(%rcx,%rax,1),%rbx
   e1e8b:	mov    0x98(%rdi),%rax
   e1e92:	mov    0xa0(%rdi),%rcx
   e1e99:	mov    %r8,%rdx
   e1e9c:	and    %rcx,%rdx
   e1e9f:	mov    %rdx,%r8
   e1ea2:	shl    $0x4,%r8
   e1ea6:	lea    (%rax,%r8,1),%rsi
   e1eaa:	mov    0x8(%rax,%r8,1),%r14
   e1eaf:	movabs $0xff00000000000000,%rdi
   e1eb9:	add    $0xffffff,%rdi
   e1ec0:	mov    0x60(%rsp),%r15
   e1ec5:	cmp    %r15,(%rax,%r8,1)
   e1ec9:	jne    e1eda <sessions::fast::parse_events_avx2+0x353a>
   e1ecb:	mov    %r14,%r8
   e1ece:	and    %rdi,%r8
   e1ed1:	cmp    %rbx,%r8
   e1ed4:	je     e1f74 <sessions::fast::parse_events_avx2+0x35d4>
   e1eda:	test   %r14,%r14
   e1edd:	je     e23c1 <sessions::fast::parse_events_avx2+0x3a21>
   e1ee3:	inc    %rdx
   e1ee6:	and    %rcx,%rdx
   e1ee9:	mov    %rdx,%r8
   e1eec:	shl    $0x4,%r8
   e1ef0:	lea    (%rax,%r8,1),%rsi
   e1ef4:	mov    0x8(%rax,%r8,1),%r14
   e1ef9:	mov    0x60(%rsp),%r15
   e1efe:	cmp    %r15,(%rax,%r8,1)
   e1f02:	je     e1ecb <sessions::fast::parse_events_avx2+0x352b>
   e1f04:	jmp    e1eda <sessions::fast::parse_events_avx2+0x353a>
   e1f06:	shr    $0x18,%r11
   e1f0a:	mov    0x38(%rsp),%rdi
   e1f0f:	lea    0x110(%rsp),%r8
   e1f17:	mov    0x8(%rsp),%rax
   e1f1c:	jmp    e273b <sessions::fast::parse_events_avx2+0x3d9b>
   e1f21:	mov    %rsi,0x58(%rsp)
   e1f26:	mov    0x70(%rsp),%rsi
   e1f2b:	mov    %rdi,0x78(%rsp)
   e1f30:	mov    %r9,0x18(%rsp)
   e1f35:	vzeroupper
   e1f38:	call   c6020 <<sessions::fast::ids::Bytes>::refill>
   e1f3d:	mov    0x58(%rsp),%rsi
   e1f42:	mov    0x38(%rsp),%r11
   e1f47:	mov    0x18(%rsp),%r9
   e1f4c:	mov    0x78(%rsp),%rdi
   e1f51:	vpbroadcastb -0xd1192(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e1f5a:	vpbroadcastb -0xd119c(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e1f63:	vpbroadcastb -0xd11a6(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e1f6c:	mov    (%rdi),%r10
   e1f6f:	jmp    df46a <sessions::fast::parse_events_avx2+0xaca>
   e1f74:	shr    $0x18,%r14
   e1f78:	mov    0x38(%rsp),%r15
   e1f7d:	mov    %r14,%rbp
   e1f80:	jmp    e2a4f <sessions::fast::parse_events_avx2+0x40af>
   e1f85:	mov    %r11,%r13
   e1f88:	mov    %r10,%r15
   e1f8b:	add    $0xe8,%rsi
   e1f92:	lea    0xb0(%rsp),%rdi
   e1f9a:	vzeroupper
   e1f9d:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e1fa2:	cmpb   $0x0,0xb0(%rsp)
   e1faa:	je     e224b <sessions::fast::parse_events_avx2+0x38ab>
   e1fb0:	mov    0xb8(%rsp),%rax
   e1fb8:	mov    0xc0(%rsp),%rdx
   e1fc0:	vpbroadcastb -0xd1203(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e1fc9:	vpbroadcastb -0xd120b(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e1fd2:	vpbroadcastb -0xd1213(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e1fdb:	jmp    df77a <sessions::fast::parse_events_avx2+0xdda>
   e1fe0:	lea    0xe8(%r9),%rsi
   e1fe7:	lea    0xb0(%rsp),%rdi
   e1fef:	vzeroupper
   e1ff2:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e1ff7:	cmpb   $0x0,0xb0(%rsp)
   e1fff:	je     e24a9 <sessions::fast::parse_events_avx2+0x3b09>
   e2005:	mov    0xb8(%rsp),%rax
   e200d:	mov    0xc0(%rsp),%rdx
   e2015:	vpbroadcastb -0xd1258(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e201e:	vpbroadcastb -0xd1260(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2027:	vpbroadcastb -0xd1268(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2030:	jmp    dffab <sessions::fast::parse_events_avx2+0x160b>
   e2035:	mov    %r11,%r15
   e2038:	mov    %r10,%r14
   e203b:	add    $0xe8,%rsi
   e2042:	lea    0xb0(%rsp),%rdi
   e204a:	vzeroupper
   e204d:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e2052:	cmpb   $0x0,0xb0(%rsp)
   e205a:	je     e24d3 <sessions::fast::parse_events_avx2+0x3b33>
   e2060:	mov    0xb8(%rsp),%rax
   e2068:	mov    0xc0(%rsp),%rcx
   e2070:	movabs $0x7676767676767676,%r9
   e207a:	vpbroadcastb -0xd12bd(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e2083:	vpbroadcastb -0xd12c5(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e208c:	vpbroadcastb -0xd12cd(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2095:	jmp    df612 <sessions::fast::parse_events_avx2+0xc72>
   e209a:	mov    %r10,0xd8(%rsp)
   e20a2:	mov    0x30(%rsp),%rax
   e20a7:	mov    0xc8(%rax),%ebp
   e20ad:	mov    %r11,%rdi
   e20b0:	mov    0x40(%rsp),%r13
   e20b5:	mov    %r13,%rsi
   e20b8:	mov    %r15,%rdx
   e20bb:	mov    %ebp,%ecx
   e20bd:	mov    %r8,%r12
   e20c0:	vzeroupper
   e20c3:	call   c5f10 <<sessions::fast::ids::Bytes>::put>
   e20c8:	mov    %rax,0x88(%rsp)
   e20d0:	mov    %r12,(%rbx)
   e20d3:	mov    %rbp,0x68(%rsp)
   e20d8:	shl    $0x20,%rbp
   e20dc:	or     %r15,%rbp
   e20df:	mov    %rbp,0x8(%rbx)
   e20e3:	add    $0x10,%rbx
   e20e7:	cmp    $0x31,%r15d
   e20eb:	jae    e2500 <sessions::fast::parse_events_avx2+0x3b60>
   e20f1:	mov    %rbx,%rdi
   e20f4:	mov    %r13,%rsi
   e20f7:	mov    %r15,%rdx
   e20fa:	call   *0x1a7530(%rip)        # 289630 <_GLOBAL_OFFSET_TABLE_+0x18>
   e2100:	mov    0x88(%rsp),%r8
   e2108:	jmp    e250b <sessions::fast::parse_events_avx2+0x3b6b>
   e210d:	lea    0xe8(%r9),%rsi
   e2114:	lea    0xb0(%rsp),%rdi
   e211c:	vzeroupper
   e211f:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e2124:	cmpb   $0x0,0xb0(%rsp)
   e212c:	je     e2654 <sessions::fast::parse_events_avx2+0x3cb4>
   e2132:	mov    0xb8(%rsp),%rax
   e213a:	mov    0xc0(%rsp),%rcx
   e2142:	vpbroadcastb -0xd1385(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e214b:	vpbroadcastb -0xd138d(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2154:	vpbroadcastb -0xd1395(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e215d:	jmp    dfe2a <sessions::fast::parse_events_avx2+0x148a>
   e2162:	mov    %r9,0xa0(%rsp)
   e216a:	mov    %r12d,0x78(%rsp)
   e216f:	mov    %rbp,0x90(%rsp)
   e2177:	mov    %r10,0xd8(%rsp)
   e217f:	mov    %r13,%rbp
   e2182:	mov    0x30(%rsp),%rcx
   e2187:	mov    0xc8(%rcx),%eax
   e218d:	mov    %rax,%rdx
   e2190:	shl    $0x18,%rdx
   e2194:	or     %rbx,%rdx
   e2197:	mov    %r15,(%rsi)
   e219a:	mov    %rdx,0x8(%rsi)
   e219e:	mov    %rax,0x68(%rsp)
   e21a3:	inc    %eax
   e21a5:	mov    %eax,0xc8(%rcx)
   e21ab:	movzbl 0xcc(%rcx),%eax
   e21b2:	mov    %r15,%rdi
   e21b5:	shrx   %rax,0x50(%rsp),%r15
   e21bc:	mov    0x68(%rcx),%rax
   e21c0:	movzbl (%rax,%r15,1),%esi
   e21c5:	mov    %r15,%r12
   e21c8:	shl    $0x6,%r12
   e21cc:	add    0x50(%rcx),%r12
   e21d0:	lea    0x1(%rsi),%rcx
   e21d4:	shl    $0x4,%esi
   e21d7:	mov    %rdi,(%rsi,%r12,1)
   e21db:	mov    %rdx,0x8(%rsi,%r12,1)
   e21e0:	cmp    $0x4,%rcx
   e21e4:	jne    e267e <sessions::fast::parse_events_avx2+0x3cde>
   e21ea:	movb   $0x0,(%rax,%r15,1)
   e21ef:	mov    0x30(%rsp),%rcx
   e21f4:	mov    0x8(%rcx),%rax
   e21f8:	mov    0x20(%rcx),%rdx
   e21fc:	mov    (%rax,%r15,8),%rcx
   e2200:	cmp    (%rdx,%r15,8),%rcx
   e2204:	je     e2f7f <sessions::fast::parse_events_avx2+0x45df>
   e220a:	vmovaps (%r12),%xmm0
   e2210:	movntdq %xmm0,(%rcx)
   e2214:	lea    0x10(%rcx),%rdx
   e2218:	vmovaps 0x10(%r12),%xmm0
   e221f:	movntdq %xmm0,(%rdx)
   e2223:	lea    0x20(%rcx),%rdx
   e2227:	vmovaps 0x20(%r12),%xmm0
   e222e:	movntdq %xmm0,(%rdx)
   e2232:	add    $0x30,%rcx
   e2236:	vmovdqa 0x30(%r12),%xmm0
   e223d:	movntdq %xmm0,(%rcx)
   e2241:	addq   $0x40,(%rax,%r15,8)
   e2246:	jmp    e2682 <sessions::fast::parse_events_avx2+0x3ce2>
   e224b:	mov    $0xffffffff,%eax
   e2250:	mov    %rax,0x10(%rsp)
   e2255:	vpbroadcastb -0xd1498(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e225e:	vpbroadcastb -0xd14a0(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2267:	vpbroadcastb -0xd14a8(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2270:	mov    %r15,%r10
   e2273:	mov    0xf0(%rsp),%rsi
   e227b:	mov    0x108(%rsp),%r15
   e2283:	mov    0x68(%r15),%rax
   e2287:	movzbl (%rax,%rbp,1),%edx
   e228b:	mov    %rbp,%rbx
   e228e:	shl    $0x6,%rbx
   e2292:	add    0x50(%r15),%rbx
   e2296:	lea    0x1(%rdx),%rcx
   e229a:	shl    $0x5,%edx
   e229d:	mov    %r10,(%rdx,%rbx,1)
   e22a1:	mov    %r12,0x8(%rdx,%rbx,1)
   e22a6:	movabs $0xffffffff00000000,%rdi
   e22b0:	mov    %rdi,0x10(%rdx,%rbx,1)
   e22b5:	movl   $0x0,0x18(%rdx,%rbx,1)
   e22bd:	mov    0x10(%rsp),%rdi
   e22c2:	mov    %edi,0x1c(%rdx,%rbx,1)
   e22c6:	cmp    $0x2,%rcx
   e22ca:	jne    dea99 <sessions::fast::parse_events_avx2+0xf9>
   e22d0:	movb   $0x0,(%rax,%rbp,1)
   e22d4:	mov    0x8(%r15),%rax
   e22d8:	mov    0x20(%r15),%rdx
   e22dc:	mov    (%rax,%rbp,8),%rcx
   e22e0:	cmp    (%rdx,%rbp,8),%rcx
   e22e4:	je     e231f <sessions::fast::parse_events_avx2+0x397f>
   e22e6:	vmovaps (%rbx),%xmm0
   e22ea:	movntdq %xmm0,(%rcx)
   e22ee:	lea    0x10(%rcx),%rdx
   e22f2:	vmovaps 0x10(%rbx),%xmm0
   e22f7:	movntdq %xmm0,(%rdx)
   e22fb:	lea    0x20(%rcx),%rdx
   e22ff:	vmovaps 0x20(%rbx),%xmm0
   e2304:	movntdq %xmm0,(%rdx)
   e2308:	add    $0x30,%rcx
   e230c:	vmovdqa 0x30(%rbx),%xmm0
   e2311:	movntdq %xmm0,(%rcx)
   e2315:	addq   $0x40,(%rax,%rbp,8)
   e231a:	jmp    deaa0 <sessions::fast::parse_events_avx2+0x100>
   e231f:	mov    %r15,%rdi
   e2322:	mov    %rbp,%rdx
   e2325:	vzeroupper
   e2328:	call   b1b20 <<sessions::fast::sink::Sink<sessions::fast::ClickRec>>::refill>
   e232d:	vpbroadcastb -0xd156e(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2336:	vpbroadcastb -0xd1578(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e233f:	vpbroadcastb -0xd1582(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e2348:	mov    0x8(%r15),%rax
   e234c:	mov    (%rax,%rbp,8),%rcx
   e2350:	jmp    e22e6 <sessions::fast::parse_events_avx2+0x3946>
   e2352:	xor    %eax,%eax
   e2354:	test   $0x1,%al
   e2356:	jne    e16bb <sessions::fast::parse_events_avx2+0x2d1b>
   e235c:	jmp    e16af <sessions::fast::parse_events_avx2+0x2d0f>
   e2361:	mov    0x18(%rsp),%rax
   e2366:	mov    0xc8(%rax),%r14d
   e236d:	mov    0x78(%rsp),%rdi
   e2372:	mov    0x60(%rsp),%rsi
   e2377:	mov    %rbx,%rdx
   e237a:	mov    %r14d,%ecx
   e237d:	mov    %r8,%rbp
   e2380:	vzeroupper
   e2383:	call   c5f10 <<sessions::fast::ids::Bytes>::put>
   e2388:	mov    %rax,%r13
   e238b:	mov    %rbp,(%r15)
   e238e:	mov    %r14,0x68(%rsp)
   e2393:	shl    $0x20,%r14
   e2397:	or     %rbx,%r14
   e239a:	mov    %r14,0x8(%r15)
   e239e:	add    $0x10,%r15
   e23a2:	cmp    $0x31,%ebx
   e23a5:	jae    e285e <sessions::fast::parse_events_avx2+0x3ebe>
   e23ab:	mov    %r15,%rdi
   e23ae:	mov    0x60(%rsp),%rsi
   e23b3:	mov    %rbx,%rdx
   e23b6:	call   *0x1a7274(%rip)        # 289630 <_GLOBAL_OFFSET_TABLE_+0x18>
   e23bc:	jmp    e2861 <sessions::fast::parse_events_avx2+0x3ec1>
   e23c1:	mov    %r13d,0x70(%rsp)
   e23c6:	mov    %r11,%rbp
   e23c9:	mov    %r10,0x58(%rsp)
   e23ce:	mov    0x18(%rsp),%rcx
   e23d3:	mov    0xc8(%rcx),%eax
   e23d9:	mov    %rax,%rdx
   e23dc:	shl    $0x18,%rdx
   e23e0:	or     %rbx,%rdx
   e23e3:	mov    0x60(%rsp),%rdi
   e23e8:	mov    %rdi,(%rsi)
   e23eb:	mov    %rdx,0x8(%rsi)
   e23ef:	mov    %rax,0x68(%rsp)
   e23f4:	inc    %eax
   e23f6:	mov    %eax,0xc8(%rcx)
   e23fc:	movzbl 0xcc(%rcx),%eax
   e2403:	shrx   %rax,0x48(%rsp),%r13
   e240a:	mov    0x68(%rcx),%rax
   e240e:	movzbl (%rax,%r13,1),%esi
   e2413:	mov    %r13,%r14
   e2416:	shl    $0x6,%r14
   e241a:	add    0x50(%rcx),%r14
   e241e:	lea    0x1(%rsi),%rcx
   e2422:	shl    $0x4,%esi
   e2425:	mov    %rdi,(%rsi,%r14,1)
   e2429:	mov    %rdx,0x8(%rsi,%r14,1)
   e242e:	cmp    $0x4,%rcx
   e2432:	jne    e29ad <sessions::fast::parse_events_avx2+0x400d>
   e2438:	movb   $0x0,(%rax,%r13,1)
   e243d:	mov    0x18(%rsp),%rcx
   e2442:	mov    0x8(%rcx),%rax
   e2446:	mov    0x20(%rcx),%rdx
   e244a:	mov    (%rax,%r13,8),%rcx
   e244e:	cmp    (%rdx,%r13,8),%rcx
   e2452:	je     e2fc9 <sessions::fast::parse_events_avx2+0x4629>
   e2458:	vmovaps (%r14),%xmm0
   e245d:	movntdq %xmm0,(%rcx)
   e2461:	lea    0x10(%rcx),%rdx
   e2465:	vmovaps 0x10(%r14),%xmm0
   e246b:	movntdq %xmm0,(%rdx)
   e246f:	lea    0x20(%rcx),%rdx
   e2473:	vmovaps 0x20(%r14),%xmm0
   e2479:	movntdq %xmm0,(%rdx)
   e247d:	add    $0x30,%rcx
   e2481:	vmovdqa 0x30(%r14),%xmm0
   e2487:	movntdq %xmm0,(%rcx)
   e248b:	addq   $0x40,(%rax,%r13,8)
   e2490:	jmp    e29b1 <sessions::fast::parse_events_avx2+0x4011>
   e2495:	xor    %eax,%eax
   e2497:	mov    0x50(%rsp),%rsi
   e249c:	test   $0x1,%al
   e249e:	jne    e17b9 <sessions::fast::parse_events_avx2+0x2e19>
   e24a4:	jmp    e17b2 <sessions::fast::parse_events_avx2+0x2e12>
   e24a9:	mov    $0xffffffff,%eax
   e24ae:	mov    %rax,0x10(%rsp)
   e24b3:	vpbroadcastb -0xd16f6(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e24bc:	vpbroadcastb -0xd16fe(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e24c5:	vpbroadcastb -0xd1706(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e24ce:	jmp    e0569 <sessions::fast::parse_events_avx2+0x1bc9>
   e24d3:	mov    $0xffffffff,%eax
   e24d8:	mov    %rax,0x10(%rsp)
   e24dd:	vpbroadcastb -0xd1720(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e24e6:	vpbroadcastb -0xd1728(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e24ef:	vpbroadcastb -0xd1730(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e24f8:	mov    %r14,%r10
   e24fb:	jmp    e2273 <sessions::fast::parse_events_avx2+0x38d3>
   e2500:	mov    0x88(%rsp),%r8
   e2508:	mov    %r8,(%rbx)
   e250b:	movabs $0xff00000000000000,%rax
   e2515:	or     %rax,%r8
   e2518:	mov    0x68(%rsp),%rax
   e251d:	inc    %eax
   e251f:	mov    0x30(%rsp),%rsi
   e2524:	mov    %eax,0xc8(%rsi)
   e252a:	movzbl 0xcc(%rsi),%eax
   e2531:	mov    0x50(%rsp),%rdi
   e2536:	shrx   %rax,%rdi,%r15
   e253b:	mov    0x68(%rsi),%rax
   e253f:	movzbl (%rax,%r15,1),%edx
   e2544:	mov    %r15,%rbx
   e2547:	shl    $0x6,%rbx
   e254b:	add    0x50(%rsi),%rbx
   e254f:	lea    0x1(%rdx),%rcx
   e2553:	shl    $0x4,%edx
   e2556:	mov    %rdi,(%rdx,%rbx,1)
   e255a:	mov    %r8,%r13
   e255d:	mov    %r8,0x8(%rdx,%rbx,1)
   e2562:	cmp    $0x4,%rcx
   e2566:	jne    e25be <sessions::fast::parse_events_avx2+0x3c1e>
   e2568:	movb   $0x0,(%rax,%r15,1)
   e256d:	mov    0x8(%rsi),%rax
   e2571:	mov    0x20(%rsi),%rdx
   e2575:	mov    (%rax,%r15,8),%rcx
   e2579:	cmp    (%rdx,%r15,8),%rcx
   e257d:	je     e2f59 <sessions::fast::parse_events_avx2+0x45b9>
   e2583:	vmovaps (%rbx),%xmm0
   e2587:	movntdq %xmm0,(%rcx)
   e258b:	lea    0x10(%rcx),%rdx
   e258f:	vmovaps 0x10(%rbx),%xmm0
   e2594:	movntdq %xmm0,(%rdx)
   e2598:	lea    0x20(%rcx),%rdx
   e259c:	vmovaps 0x20(%rbx),%xmm0
   e25a1:	movntdq %xmm0,(%rdx)
   e25a5:	add    $0x30,%rcx
   e25a9:	vmovdqa 0x30(%rbx),%xmm0
   e25ae:	movntdq %xmm0,(%rcx)
   e25b2:	addq   $0x40,(%rax,%r15,8)
   e25b7:	mov    0x30(%rsp),%rsi
   e25bc:	jmp    e25c2 <sessions::fast::parse_events_avx2+0x3c22>
   e25be:	mov    %cl,(%rax,%r15,1)
   e25c2:	mov    0x80(%rsi),%rax
   e25c9:	cmp    $0xffffffffffffffff,%rax
   e25cd:	je     e260a <sessions::fast::parse_events_avx2+0x3c6a>
   e25cf:	mov    0x90(%rsi),%rbx
   e25d6:	cmp    %rax,%rbx
   e25d9:	je     e2d33 <sessions::fast::parse_events_avx2+0x4393>
   e25df:	mov    0x30(%rsp),%rsi
   e25e4:	mov    0x88(%rsi),%rax
   e25eb:	mov    %rbx,%rcx
   e25ee:	shl    $0x4,%rcx
   e25f2:	mov    0x50(%rsp),%rdx
   e25f7:	mov    %rdx,(%rax,%rcx,1)
   e25fb:	mov    %r13,0x8(%rax,%rcx,1)
   e2600:	inc    %rbx
   e2603:	mov    %rbx,0x90(%rsi)
   e260a:	mov    0xc4(%rsi),%eax
   e2610:	inc    %eax
   e2612:	mov    %eax,0xc4(%rsi)
   e2618:	cmp    0xc0(%rsi),%eax
   e261e:	jae    e2f17 <sessions::fast::parse_events_avx2+0x4577>
   e2624:	lea    0x110(%rsp),%r8
   e262c:	vpbroadcastb -0xd186f(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e2635:	vpbroadcastb -0xd1877(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e263e:	vpbroadcastb -0xd187f(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2647:	mov    0xa8(%rsp),%r13
   e264f:	jmp    e270f <sessions::fast::parse_events_avx2+0x3d6f>
   e2654:	mov    $0xffffffff,%eax
   e2659:	mov    %rax,0x10(%rsp)
   e265e:	vpbroadcastb -0xd18a1(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e2667:	vpbroadcastb -0xd18a9(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2670:	vpbroadcastb -0xd18b1(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2679:	jmp    e0744 <sessions::fast::parse_events_avx2+0x1da4>
   e267e:	mov    %cl,(%rax,%r15,1)
   e2682:	mov    0x30(%rsp),%rdx
   e2687:	mov    0x80(%rdx),%rax
   e268e:	cmp    $0xffffffffffffffff,%rax
   e2692:	je     e26cf <sessions::fast::parse_events_avx2+0x3d2f>
   e2694:	mov    0x90(%rdx),%r15
   e269b:	cmp    %rax,%r15
   e269e:	je     e2d49 <sessions::fast::parse_events_avx2+0x43a9>
   e26a4:	mov    0x30(%rsp),%rdx
   e26a9:	mov    0x88(%rdx),%rax
   e26b0:	mov    %r15,%rcx
   e26b3:	shl    $0x4,%rcx
   e26b7:	mov    0x40(%rsp),%rsi
   e26bc:	mov    %rsi,(%rax,%rcx,1)
   e26c0:	mov    %rbx,0x8(%rax,%rcx,1)
   e26c5:	inc    %r15
   e26c8:	mov    %r15,0x90(%rdx)
   e26cf:	mov    0xbc(%rdx),%eax
   e26d5:	inc    %eax
   e26d7:	mov    %eax,0xbc(%rdx)
   e26dd:	cmp    0xb8(%rdx),%eax
   e26e3:	jae    e2f26 <sessions::fast::parse_events_avx2+0x4586>
   e26e9:	lea    0x110(%rsp),%r8
   e26f1:	vpbroadcastb -0xd1934(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e26fa:	vpbroadcastb -0xd193c(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2703:	vpbroadcastb -0xd1944(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e270c:	mov    %rbp,%r13
   e270f:	mov    0xd8(%rsp),%r10
   e2717:	mov    0x90(%rsp),%rbp
   e271f:	mov    0x78(%rsp),%r12d
   e2724:	mov    0x38(%rsp),%rdi
   e2729:	mov    0xa0(%rsp),%r9
   e2731:	mov    0x8(%rsp),%rax
   e2736:	mov    0x68(%rsp),%r11
   e273b:	mov    %eax,%edx
   e273d:	shl    $0x5,%edx
   e2740:	mov    %r11d,0x10(%r8,%rdx,1)
   e2745:	mov    0x490(%rsp,%rax,4),%r15d
   e274d:	mov    0x68(%rdi),%rax
   e2751:	movzbl (%rax,%r15,1),%esi
   e2756:	mov    %r15,%rbx
   e2759:	shl    $0x6,%rbx
   e275d:	add    0x50(%rdi),%rbx
   e2761:	lea    0x1(%rsi),%rcx
   e2765:	shl    $0x5,%esi
   e2768:	vmovdqu (%r8,%rdx,1),%ymm0
   e276e:	vmovdqu %ymm0,(%rsi,%rbx,1)
   e2773:	cmp    $0x2,%rcx
   e2777:	jne    e27ca <sessions::fast::parse_events_avx2+0x3e2a>
   e2779:	movb   $0x0,(%rax,%r15,1)
   e277e:	mov    0x8(%rdi),%rax
   e2782:	mov    0x20(%rdi),%rdx
   e2786:	mov    (%rax,%r15,8),%rcx
   e278a:	cmp    (%rdx,%r15,8),%rcx
   e278e:	je     e2d91 <sessions::fast::parse_events_avx2+0x43f1>
   e2794:	vmovaps (%rbx),%xmm0
   e2798:	movntdq %xmm0,(%rcx)
   e279c:	lea    0x10(%rcx),%rdx
   e27a0:	vmovaps 0x10(%rbx),%xmm0
   e27a5:	movntdq %xmm0,(%rdx)
   e27a9:	lea    0x20(%rcx),%rdx
   e27ad:	vmovaps 0x20(%rbx),%xmm0
   e27b2:	movntdq %xmm0,(%rdx)
   e27b6:	add    $0x30,%rcx
   e27ba:	vmovdqa 0x30(%rbx),%xmm0
   e27bf:	movntdq %xmm0,(%rcx)
   e27c3:	addq   $0x40,(%rax,%r15,8)
   e27c8:	jmp    e27ce <sessions::fast::parse_events_avx2+0x3e2e>
   e27ca:	mov    %cl,(%rax,%r15,1)
   e27ce:	mov    0x48(%rsp),%r8
   e27d3:	mov    0x18(%rsp),%rdx
   e27d8:	mov    0x70(%rsp),%r15
   e27dd:	mov    0x8(%rsp),%rsi
   e27e2:	mov    %esi,%eax
   e27e4:	shl    $0x5,%eax
   e27e7:	lea    0x110(%rsp),%rcx
   e27ef:	mov    %rsi,%rdi
   e27f2:	mov    %rcx,%rsi
   e27f5:	mov    %r10,(%rcx,%rax,1)
   e27f9:	mov    0x98(%rsp),%rcx
   e2801:	mov    %rcx,0x8(%rsi,%rax,1)
   e2806:	movl   $0x0,0x10(%rsi,%rax,1)
   e280e:	mov    %r14d,0x14(%rsi,%rax,1)
   e2813:	mov    %r12d,0x18(%rsi,%rax,1)
   e2818:	mov    0x10(%rsp),%rcx
   e281d:	mov    %ecx,0x1c(%rsi,%rax,1)
   e2821:	mov    %edi,%eax
   e2823:	shl    $0x4,%eax
   e2826:	lea    0x310(%rsp),%rcx
   e282e:	mov    %r13,(%rcx,%rax,1)
   e2832:	mov    %rdx,0x8(%rcx,%rax,1)
   e2837:	mov    %r9,0x410(%rsp,%rdi,8)
   e283f:	mov    %ebp,0x490(%rsp,%rdi,4)
   e2846:	mov    %r8d,0x4d0(%rsp,%rdi,4)
   e284e:	inc    %r15
   e2851:	mov    %r15,0x510(%rsp)
   e2859:	jmp    deaa0 <sessions::fast::parse_events_avx2+0x100>
   e285e:	mov    %r13,(%r15)
   e2861:	movabs $0xff00000000000000,%rax
   e286b:	or     %rax,%r13
   e286e:	mov    0x68(%rsp),%rax
   e2873:	inc    %eax
   e2875:	mov    0x18(%rsp),%rcx
   e287a:	mov    %eax,0xc8(%rcx)
   e2880:	movzbl 0xcc(%rcx),%eax
   e2887:	mov    0x48(%rsp),%rsi
   e288c:	shrx   %rax,%rsi,%rbx
   e2891:	mov    0x68(%rcx),%rax
   e2895:	movzbl (%rax,%rbx,1),%edx
   e2899:	mov    %rbx,%r14
   e289c:	shl    $0x6,%r14
   e28a0:	add    0x50(%rcx),%r14
   e28a4:	lea    0x1(%rdx),%rcx
   e28a8:	shl    $0x4,%edx
   e28ab:	mov    %rsi,(%rdx,%r14,1)
   e28af:	mov    %r13,%r15
   e28b2:	mov    %r13,0x8(%rdx,%r14,1)
   e28b7:	cmp    $0x4,%rcx
   e28bb:	jne    e2916 <sessions::fast::parse_events_avx2+0x3f76>
   e28bd:	movb   $0x0,(%rax,%rbx,1)
   e28c1:	mov    0x18(%rsp),%rcx
   e28c6:	mov    0x8(%rcx),%rax
   e28ca:	mov    0x20(%rcx),%rdx
   e28ce:	mov    (%rax,%rbx,8),%rcx
   e28d2:	cmp    (%rdx,%rbx,8),%rcx
   e28d6:	je     e2fa7 <sessions::fast::parse_events_avx2+0x4607>
   e28dc:	vmovaps (%r14),%xmm0
   e28e1:	movntdq %xmm0,(%rcx)
   e28e5:	lea    0x10(%rcx),%rdx
   e28e9:	vmovaps 0x10(%r14),%xmm0
   e28ef:	movntdq %xmm0,(%rdx)
   e28f3:	lea    0x20(%rcx),%rdx
   e28f7:	vmovaps 0x20(%r14),%xmm0
   e28fd:	movntdq %xmm0,(%rdx)
   e2901:	add    $0x30,%rcx
   e2905:	vmovdqa 0x30(%r14),%xmm0
   e290b:	movntdq %xmm0,(%rcx)
   e290f:	addq   $0x40,(%rax,%rbx,8)
   e2914:	jmp    e2919 <sessions::fast::parse_events_avx2+0x3f79>
   e2916:	mov    %cl,(%rax,%rbx,1)
   e2919:	mov    0x18(%rsp),%rdx
   e291e:	mov    0x80(%rdx),%rax
   e2925:	cmp    $0xffffffffffffffff,%rax
   e2929:	je     e2966 <sessions::fast::parse_events_avx2+0x3fc6>
   e292b:	mov    0x90(%rdx),%rbx
   e2932:	cmp    %rax,%rbx
   e2935:	je     e2d62 <sessions::fast::parse_events_avx2+0x43c2>
   e293b:	mov    0x18(%rsp),%rdx
   e2940:	mov    0x88(%rdx),%rax
   e2947:	mov    %rbx,%rcx
   e294a:	shl    $0x4,%rcx
   e294e:	mov    0x48(%rsp),%rsi
   e2953:	mov    %rsi,(%rax,%rcx,1)
   e2957:	mov    %r15,0x8(%rax,%rcx,1)
   e295c:	inc    %rbx
   e295f:	mov    %rbx,0x90(%rdx)
   e2966:	mov    0xc4(%rdx),%eax
   e296c:	inc    %eax
   e296e:	mov    %eax,0xc4(%rdx)
   e2974:	cmp    0xc0(%rdx),%eax
   e297a:	jae    e2f38 <sessions::fast::parse_events_avx2+0x4598>
   e2980:	vpbroadcastb -0xd1bc3(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e2989:	vpbroadcastb -0xd1bcb(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2992:	vpbroadcastb -0xd1bd3(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e299b:	mov    0x58(%rsp),%r10
   e29a0:	mov    0x90(%rsp),%r11
   e29a8:	jmp    e2a3b <sessions::fast::parse_events_avx2+0x409b>
   e29ad:	mov    %cl,(%rax,%r13,1)
   e29b1:	mov    0x18(%rsp),%rdx
   e29b6:	mov    0x80(%rdx),%rax
   e29bd:	cmp    $0xffffffffffffffff,%rax
   e29c1:	je     e29fe <sessions::fast::parse_events_avx2+0x405e>
   e29c3:	mov    0x90(%rdx),%r14
   e29ca:	cmp    %rax,%r14
   e29cd:	je     e2d78 <sessions::fast::parse_events_avx2+0x43d8>
   e29d3:	mov    0x18(%rsp),%rdx
   e29d8:	mov    0x88(%rdx),%rax
   e29df:	mov    %r14,%rcx
   e29e2:	shl    $0x4,%rcx
   e29e6:	mov    0x60(%rsp),%rsi
   e29eb:	mov    %rsi,(%rax,%rcx,1)
   e29ef:	mov    %rbx,0x8(%rax,%rcx,1)
   e29f4:	inc    %r14
   e29f7:	mov    %r14,0x90(%rdx)
   e29fe:	mov    0xbc(%rdx),%eax
   e2a04:	inc    %eax
   e2a06:	mov    %eax,0xbc(%rdx)
   e2a0c:	cmp    0xb8(%rdx),%eax
   e2a12:	jae    e2f47 <sessions::fast::parse_events_avx2+0x45a7>
   e2a18:	vpbroadcastb -0xd1c5b(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e2a21:	vpbroadcastb -0xd1c63(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2a2a:	vpbroadcastb -0xd1c6b(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2a33:	mov    0x58(%rsp),%r10
   e2a38:	mov    %rbp,%r11
   e2a3b:	mov    0x10(%rsp),%r9
   e2a40:	mov    0x70(%rsp),%r13d
   e2a45:	mov    0x38(%rsp),%r15
   e2a4a:	mov    0x68(%rsp),%rbp
   e2a4f:	mov    0x50(%rsp),%rcx
   e2a54:	mov    %ecx,%edx
   e2a56:	shl    $0x5,%edx
   e2a59:	lea    0x110(%rsp),%r8
   e2a61:	mov    %ebp,0x10(%r8,%rdx,1)
   e2a66:	mov    0x490(%rsp,%rcx,4),%ebx
   e2a6d:	mov    0x20(%rsp),%rdi
   e2a72:	mov    0x68(%rdi),%rax
   e2a76:	movzbl (%rax,%rbx,1),%esi
   e2a7a:	mov    %rbx,%r14
   e2a7d:	shl    $0x6,%r14
   e2a81:	add    0x50(%rdi),%r14
   e2a85:	lea    0x1(%rsi),%rcx
   e2a89:	shl    $0x5,%esi
   e2a8c:	vmovdqu (%r8,%rdx,1),%ymm0
   e2a92:	vmovdqu %ymm0,(%rsi,%r14,1)
   e2a98:	cmp    $0x2,%rcx
   e2a9c:	jne    e2af7 <sessions::fast::parse_events_avx2+0x4157>
   e2a9e:	movb   $0x0,(%rax,%rbx,1)
   e2aa2:	mov    0x8(%rdi),%rax
   e2aa6:	mov    0x20(%rdi),%rdx
   e2aaa:	mov    (%rax,%rbx,8),%rcx
   e2aae:	cmp    (%rdx,%rbx,8),%rcx
   e2ab2:	mov    0x50(%rsp),%rsi
   e2ab7:	je     e2dfd <sessions::fast::parse_events_avx2+0x445d>
   e2abd:	vmovaps (%r14),%xmm0
   e2ac2:	movntdq %xmm0,(%rcx)
   e2ac6:	lea    0x10(%rcx),%rdx
   e2aca:	vmovaps 0x10(%r14),%xmm0
   e2ad0:	movntdq %xmm0,(%rdx)
   e2ad4:	lea    0x20(%rcx),%rdx
   e2ad8:	vmovaps 0x20(%r14),%xmm0
   e2ade:	movntdq %xmm0,(%rdx)
   e2ae2:	add    $0x30,%rcx
   e2ae6:	vmovdqa 0x30(%r14),%xmm0
   e2aec:	movntdq %xmm0,(%rcx)
   e2af0:	addq   $0x40,(%rax,%rbx,8)
   e2af5:	jmp    e2aff <sessions::fast::parse_events_avx2+0x415f>
   e2af7:	mov    %cl,(%rax,%rbx,1)
   e2afa:	mov    0x50(%rsp),%rsi
   e2aff:	mov    0x510(%rsp),%rax
   e2b07:	mov    0x88(%rsp),%r8
   e2b0f:	mov    0x8(%rsp),%rbx
   e2b14:	mov    %esi,%ecx
   e2b16:	shl    $0x5,%ecx
   e2b19:	lea    0x110(%rsp),%rdx
   e2b21:	mov    %rsi,%rdi
   e2b24:	mov    0x40(%rsp),%rsi
   e2b29:	mov    %rsi,(%rdx,%rcx,1)
   e2b2d:	mov    %r10,0x8(%rdx,%rcx,1)
   e2b32:	movl   $0x0,0x10(%rdx,%rcx,1)
   e2b3a:	mov    %r12d,0x14(%rdx,%rcx,1)
   e2b3f:	mov    %r13d,0x18(%rdx,%rcx,1)
   e2b44:	mov    %r9d,0x1c(%rdx,%rcx,1)
   e2b49:	mov    %edi,%ecx
   e2b4b:	shl    $0x4,%ecx
   e2b4e:	lea    0x310(%rsp),%rdx
   e2b56:	mov    0xa8(%rsp),%rsi
   e2b5e:	mov    %rsi,(%rdx,%rcx,1)
   e2b62:	mov    %rbx,0x8(%rdx,%rcx,1)
   e2b67:	mov    %r15,0x410(%rsp,%rdi,8)
   e2b6f:	mov    %r11d,0x490(%rsp,%rdi,4)
   e2b77:	mov    %r8d,0x4d0(%rsp,%rdi,4)
   e2b7f:	inc    %rax
   e2b82:	mov    %rax,0x510(%rsp)
   e2b8a:	jmp    e1880 <sessions::fast::parse_events_avx2+0x2ee0>
   e2b8f:	lea    0xe8(%r9),%rsi
   e2b96:	lea    0xb0(%rsp),%rdi
   e2b9e:	vzeroupper
   e2ba1:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e2ba6:	cmpb   $0x0,0xb0(%rsp)
   e2bae:	je     e24dd <sessions::fast::parse_events_avx2+0x3b3d>
   e2bb4:	mov    0xb8(%rsp),%rax
   e2bbc:	mov    0xc0(%rsp),%rdx
   e2bc4:	movabs $0x7676767676767676,%r9
   e2bce:	vpbroadcastb -0xd1e11(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e2bd7:	vpbroadcastb -0xd1e19(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2be0:	vpbroadcastb -0xd1e21(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2be9:	jmp    e0847 <sessions::fast::parse_events_avx2+0x1ea7>
   e2bee:	lea    0xe8(%r9),%rsi
   e2bf5:	lea    0xb0(%rsp),%rdi
   e2bfd:	vzeroupper
   e2c00:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e2c05:	cmpb   $0x0,0xb0(%rsp)
   e2c0d:	je     e2d0d <sessions::fast::parse_events_avx2+0x436d>
   e2c13:	mov    0xb8(%rsp),%rax
   e2c1b:	mov    0xc0(%rsp),%rdx
   e2c23:	movabs $0x7676767676767676,%r9
   e2c2d:	vpbroadcastb -0xd1e70(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e2c36:	vpbroadcastb -0xd1e78(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2c3f:	vpbroadcastb -0xd1e80(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2c48:	jmp    e0b39 <sessions::fast::parse_events_avx2+0x2199>
   e2c4d:	mov    %r11,%r15
   e2c50:	mov    %r10,%r14
   e2c53:	lea    0xe8(%r9),%rsi
   e2c5a:	lea    0xb0(%rsp),%rdi
   e2c62:	vzeroupper
   e2c65:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e2c6a:	cmpb   $0x0,0xb0(%rsp)
   e2c72:	je     e24dd <sessions::fast::parse_events_avx2+0x3b3d>
   e2c78:	mov    0xb8(%rsp),%rax
   e2c80:	mov    0xc0(%rsp),%rcx
   e2c88:	movabs $0x7676767676767676,%r9
   e2c92:	vpbroadcastb -0xd1ed5(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e2c9b:	vpbroadcastb -0xd1edd(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2ca4:	vpbroadcastb -0xd1ee5(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2cad:	jmp    dfbc0 <sessions::fast::parse_events_avx2+0x1220>
   e2cb2:	lea    0xe8(%r9),%rsi
   e2cb9:	lea    0xb0(%rsp),%rdi
   e2cc1:	vzeroupper
   e2cc4:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e2cc9:	cmpb   $0x0,0xb0(%rsp)
   e2cd1:	je     e2d0d <sessions::fast::parse_events_avx2+0x436d>
   e2cd3:	mov    0xb8(%rsp),%rax
   e2cdb:	mov    0xc0(%rsp),%rcx
   e2ce3:	movabs $0x7676767676767676,%r9
   e2ced:	vpbroadcastb -0xd1f30(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e2cf6:	vpbroadcastb -0xd1f38(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2cff:	vpbroadcastb -0xd1f40(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2d08:	jmp    e043e <sessions::fast::parse_events_avx2+0x1a9e>
   e2d0d:	vpbroadcastb -0xd1f50(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e2d16:	vpbroadcastb -0xd1f58(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2d1f:	vpbroadcastb -0xd1f60(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2d28:	mov    %r12,%r10
   e2d2b:	mov    %r13,%r11
   e2d2e:	jmp    e17ca <sessions::fast::parse_events_avx2+0x2e2a>
   e2d33:	mov    0x30(%rsp),%rax
   e2d38:	lea    0x80(%rax),%rdi
   e2d3f:	call   b2cd0 <<alloc::raw_vec::RawVec<[u64; 2]>>::grow_one>
   e2d44:	jmp    e25df <sessions::fast::parse_events_avx2+0x3c3f>
   e2d49:	mov    0x30(%rsp),%rax
   e2d4e:	lea    0x80(%rax),%rdi
   e2d55:	vzeroupper
   e2d58:	call   b2cd0 <<alloc::raw_vec::RawVec<[u64; 2]>>::grow_one>
   e2d5d:	jmp    e26a4 <sessions::fast::parse_events_avx2+0x3d04>
   e2d62:	mov    0x18(%rsp),%rax
   e2d67:	lea    0x80(%rax),%rdi
   e2d6e:	call   b2cd0 <<alloc::raw_vec::RawVec<[u64; 2]>>::grow_one>
   e2d73:	jmp    e293b <sessions::fast::parse_events_avx2+0x3f9b>
   e2d78:	mov    0x18(%rsp),%rax
   e2d7d:	lea    0x80(%rax),%rdi
   e2d84:	vzeroupper
   e2d87:	call   b2cd0 <<alloc::raw_vec::RawVec<[u64; 2]>>::grow_one>
   e2d8c:	jmp    e29d3 <sessions::fast::parse_events_avx2+0x4033>
   e2d91:	mov    0xe0(%rsp),%rsi
   e2d99:	mov    %r15,%rdx
   e2d9c:	mov    %r13,0xa8(%rsp)
   e2da4:	mov    %rbp,0x90(%rsp)
   e2dac:	mov    %r10,%rbp
   e2daf:	mov    %r9,%r13
   e2db2:	vzeroupper
   e2db5:	call   b1b20 <<sessions::fast::sink::Sink<sessions::fast::ClickRec>>::refill>
   e2dba:	mov    %r13,%r9
   e2dbd:	mov    %rbp,%r10
   e2dc0:	mov    0x90(%rsp),%rbp
   e2dc8:	mov    0xa8(%rsp),%r13
   e2dd0:	vpbroadcastb -0xd2011(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2dd9:	vpbroadcastb -0xd201b(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2de2:	vpbroadcastb -0xd2025(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e2deb:	mov    0x38(%rsp),%rax
   e2df0:	mov    0x8(%rax),%rax
   e2df4:	mov    (%rax,%r15,8),%rcx
   e2df8:	jmp    e2794 <sessions::fast::parse_events_avx2+0x3df4>
   e2dfd:	mov    0x30(%rsp),%rsi
   e2e02:	mov    %rbx,%rdx
   e2e05:	mov    %r10,%r15
   e2e08:	mov    %r13d,0x70(%rsp)
   e2e0d:	mov    %r11,%r13
   e2e10:	mov    %r9,%rbp
   e2e13:	vzeroupper
   e2e16:	call   b1b20 <<sessions::fast::sink::Sink<sessions::fast::ClickRec>>::refill>
   e2e1b:	mov    0x50(%rsp),%rsi
   e2e20:	mov    %rbp,%r9
   e2e23:	mov    %r13,%r11
   e2e26:	mov    0x70(%rsp),%r13d
   e2e2b:	mov    %r15,%r10
   e2e2e:	mov    0x38(%rsp),%r15
   e2e33:	vpbroadcastb -0xd2074(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2e3c:	vpbroadcastb -0xd207e(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2e45:	vpbroadcastb -0xd2088(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e2e4e:	mov    0x20(%rsp),%rax
   e2e53:	mov    0x8(%rax),%rax
   e2e57:	mov    (%rax,%rbx,8),%rcx
   e2e5b:	jmp    e2abd <sessions::fast::parse_events_avx2+0x411d>
   e2e60:	add    %r13,%rsi
   e2e63:	mov    0x50(%rsp),%rdi
   e2e68:	mov    %r15,%rdx
   e2e6b:	mov    %r10,0xd8(%rsp)
   e2e73:	mov    %r11,%r15
   e2e76:	vzeroupper
   e2e79:	call   b43f0 <<sessions::fast::ids::KeyMap>::get_long>
   e2e7e:	mov    %r15,%r11
   e2e81:	mov    0xd8(%rsp),%r10
   e2e89:	vpbroadcastb -0xd20ca(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2e92:	vpbroadcastb -0xd20d4(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2e9b:	vpbroadcastb -0xd20de(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e2ea4:	movabs $0xe7037ed1a0b428db,%r9
   e2eae:	mov    %edx,%r12d
   e2eb1:	test   $0x1,%al
   e2eb3:	je     e16af <sessions::fast::parse_events_avx2+0x2d0f>
   e2eb9:	jmp    e16bb <sessions::fast::parse_events_avx2+0x2d1b>
   e2ebe:	mov    0x38(%rsp),%rsi
   e2ec3:	add    %rcx,%rsi
   e2ec6:	mov    %rbp,%rdi
   e2ec9:	mov    %r10,%r14
   e2ecc:	mov    %r11,%r13
   e2ecf:	vzeroupper
   e2ed2:	call   b43f0 <<sessions::fast::ids::KeyMap>::get_long>
   e2ed7:	mov    %r13,%r11
   e2eda:	mov    %r14,%r10
   e2edd:	vpbroadcastb -0xd211e(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e2ee6:	vpbroadcastb -0xd2128(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e2eef:	vpbroadcastb -0xd2132(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e2ef8:	movabs $0xe7037ed1a0b428db,%r9
   e2f02:	mov    %edx,%r13d
   e2f05:	mov    0x50(%rsp),%rsi
   e2f0a:	test   $0x1,%al
   e2f0c:	je     e17b2 <sessions::fast::parse_events_avx2+0x2e12>
   e2f12:	jmp    e17b9 <sessions::fast::parse_events_avx2+0x2e19>
   e2f17:	mov    0x30(%rsp),%rdi
   e2f1c:	call   b10e0 <<sessions::fast::ids::Interner>::grow_wide>
   e2f21:	jmp    e2624 <sessions::fast::parse_events_avx2+0x3c84>
   e2f26:	mov    0x30(%rsp),%rdi
   e2f2b:	vzeroupper
   e2f2e:	call   b0f90 <<sessions::fast::ids::Interner>::grow>
   e2f33:	jmp    e26e9 <sessions::fast::parse_events_avx2+0x3d49>
   e2f38:	mov    0x18(%rsp),%rdi
   e2f3d:	call   b10e0 <<sessions::fast::ids::Interner>::grow_wide>
   e2f42:	jmp    e2980 <sessions::fast::parse_events_avx2+0x3fe0>
   e2f47:	mov    0x18(%rsp),%rdi
   e2f4c:	vzeroupper
   e2f4f:	call   b0f90 <<sessions::fast::ids::Interner>::grow>
   e2f54:	jmp    e2a18 <sessions::fast::parse_events_avx2+0x4078>
   e2f59:	mov    0x30(%rsp),%r12
   e2f5e:	mov    %r12,%rdi
   e2f61:	mov    0xe0(%rsp),%rsi
   e2f69:	mov    %r15,%rdx
   e2f6c:	call   b1380 <<sessions::fast::sink::Sink<[u64; 2]>>::refill>
   e2f71:	mov    0x8(%r12),%rax
   e2f76:	mov    (%rax,%r15,8),%rcx
   e2f7a:	jmp    e2583 <sessions::fast::parse_events_avx2+0x3be3>
   e2f7f:	mov    0x30(%rsp),%r13
   e2f84:	mov    %r13,%rdi
   e2f87:	mov    0xe0(%rsp),%rsi
   e2f8f:	mov    %r15,%rdx
   e2f92:	vzeroupper
   e2f95:	call   b1380 <<sessions::fast::sink::Sink<[u64; 2]>>::refill>
   e2f9a:	mov    0x8(%r13),%rax
   e2f9e:	mov    (%rax,%r15,8),%rcx
   e2fa2:	jmp    e220a <sessions::fast::parse_events_avx2+0x386a>
   e2fa7:	mov    0x18(%rsp),%r13
   e2fac:	mov    %r13,%rdi
   e2faf:	mov    0x30(%rsp),%rsi
   e2fb4:	mov    %rbx,%rdx
   e2fb7:	call   b1380 <<sessions::fast::sink::Sink<[u64; 2]>>::refill>
   e2fbc:	mov    0x8(%r13),%rax
   e2fc0:	mov    (%rax,%rbx,8),%rcx
   e2fc4:	jmp    e28dc <sessions::fast::parse_events_avx2+0x3f3c>
   e2fc9:	mov    0x18(%rsp),%r15
   e2fce:	mov    %r15,%rdi
   e2fd1:	mov    0x30(%rsp),%rsi
   e2fd6:	mov    %r13,%rdx
   e2fd9:	vzeroupper
   e2fdc:	call   b1380 <<sessions::fast::sink::Sink<[u64; 2]>>::refill>
   e2fe1:	mov    0x8(%r15),%rax
   e2fe5:	mov    (%rax,%r13,8),%rcx
   e2fe9:	jmp    e2458 <sessions::fast::parse_events_avx2+0x3ab8>
   e2fee:	xor    %r14d,%r14d
   e2ff1:	jmp    e300c <sessions::fast::parse_events_avx2+0x466c>
   e2ff3:	mov    0xc8(%rsp),%r15
   e2ffb:	cmp    %r15,%r14
   e2ffe:	lea    0x110(%rsp),%rbx
   e3006:	jae    e30be <sessions::fast::parse_events_avx2+0x471e>
   e300c:	mov    %r15,%r12
   e300f:	sub    %r14,%r12
   e3012:	mov    %r12,%rbx
   e3015:	add    $0xa0,%rbx
   e301c:	jns    e3026 <sessions::fast::parse_events_avx2+0x4686>
   e301e:	vzeroupper
   e3021:	call   103f10 <alloc::raw_vec::capacity_overflow>
   e3026:	mov    %rbx,%rdi
   e3029:	vzeroupper
   e302c:	call   *0x1a628e(%rip)        # 2892c0 <_DYNAMIC+0x158>
   e3032:	mov    %rax,0xd0(%rsp)
   e303a:	test   %rax,%rax
   e303d:	je     e76e3 <sessions::fast::parse_events_avx2+0x8d43>
   e3043:	cmp    %r14,%r15
   e3046:	jne    e310b <sessions::fast::parse_events_avx2+0x476b>
   e304c:	vpxor  %xmm0,%xmm0,%xmm0
   e3050:	mov    0xd0(%rsp),%rax
   e3058:	vmovdqu %ymm0,0x80(%rax,%r12,1)
   e3062:	vmovdqu %ymm0,0x60(%rax,%r12,1)
   e3069:	vmovdqu %ymm0,0x40(%rax,%r12,1)
   e3070:	vmovdqu %ymm0,0x20(%rax,%r12,1)
   e3077:	vmovdqu %ymm0,(%rax,%r12,1)
   e307d:	mov    0x100(%rsp),%rsi
   e3085:	mov    0xf0(%rsp),%rdx
   e308d:	mov    0xf8(%rsp),%rcx
   e3095:	mov    0x108(%rsp),%r8
   e309d:	lea    0x110(%rsp),%rbx
   e30a5:	mov    %rbx,%rdi
   e30a8:	vzeroupper
   e30ab:	call   afef0 <<sessions::fast::Ring<sessions::fast::ClickRec>>::drain>
   e30b0:	mov    0xd0(%rsp),%rdi
   e30b8:	call   *0x1a620a(%rip)        # 2892c8 <_DYNAMIC+0x160>
   e30be:	mov    0x100(%rsp),%rsi
   e30c6:	mov    0xf0(%rsp),%rdx
   e30ce:	mov    0xf8(%rsp),%rcx
   e30d6:	mov    0x108(%rsp),%r8
   e30de:	mov    %rbx,%rdi
   e30e1:	vzeroupper
   e30e4:	call   afef0 <<sessions::fast::Ring<sessions::fast::ClickRec>>::drain>
   e30e9:	mov    0x528(%rsp),%rax
   e30f1:	movzbl 0x530(%rsp),%edx
   e30f9:	add    $0x538,%rsp
   e3100:	pop    %rbx
   e3101:	pop    %r12
   e3103:	pop    %r13
   e3105:	pop    %r14
   e3107:	pop    %r15
   e3109:	pop    %rbp
   e310a:	ret
   e310b:	add    %r14,%r13
   e310e:	mov    0xd0(%rsp),%rbx
   e3116:	mov    %rbx,%rdi
   e3119:	mov    %r13,%rsi
   e311c:	mov    %r12,%rdx
   e311f:	call   *0x1a650b(%rip)        # 289630 <_GLOBAL_OFFSET_TABLE_+0x18>
   e3125:	vpxor  %xmm0,%xmm0,%xmm0
   e3129:	vmovdqu %ymm0,(%rbx,%r12,1)
   e312f:	vmovdqu %ymm0,0x20(%rbx,%r12,1)
   e3136:	vmovdqu %ymm0,0x40(%rbx,%r12,1)
   e313d:	vmovdqu %ymm0,0x60(%rbx,%r12,1)
   e3144:	vmovdqu %ymm0,0x80(%rbx,%r12,1)
   e314e:	vpbroadcastb -0xd2391(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e3157:	vpbroadcastb -0xd2399(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e3160:	vpbroadcastb -0xd23a1(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e3169:	xor    %eax,%eax
   e316b:	mov    %r12,0xa8(%rsp)
   e3173:	data16 data16 data16 cs nopw 0x0(%rax,%rax,1)
   e3180:	mov    %rax,0x98(%rsp)
   e3188:	mov    0xd0(%rsp),%rbp
   e3190:	vmovdqu 0x0(%rbp,%rax,1),%ymm3
   e3196:	vmovdqu 0x20(%rbp,%rax,1),%ymm2
   e319c:	vmovdqu 0x40(%rbp,%rax,1),%ymm1
   e31a2:	vmovdqu 0x60(%rbp,%rax,1),%ymm0
   e31a8:	vpcmpeqb %ymm5,%ymm3,%ymm4
   e31ac:	vpmovmskb %ymm4,%ecx
   e31b0:	vpcmpeqb %ymm5,%ymm2,%ymm4
   e31b4:	vpmovmskb %ymm4,%eax
   e31b8:	shl    $0x20,%rax
   e31bc:	or     %rcx,%rax
   e31bf:	vpcmpeqb %ymm5,%ymm1,%ymm4
   e31c3:	vpmovmskb %ymm4,%ecx
   e31c7:	vpcmpeqb %ymm5,%ymm0,%ymm4
   e31cb:	vpmovmskb %ymm4,%r8d
   e31cf:	shl    $0x20,%r8
   e31d3:	or     %rcx,%r8
   e31d6:	tzcnt  %rax,%rsi
   e31db:	tzcnt  %r8,%rcx
   e31e0:	test   %rax,%rax
   e31e3:	mov    $0x0,%edx
   e31e8:	mov    %rcx,0x60(%rsp)
   e31ed:	cmove  %ecx,%edx
   e31f0:	mov    %rsi,0x10(%rsp)
   e31f5:	add    %esi,%edx
   e31f7:	test   %rax,%rax
   e31fa:	mov    $0xffffffffffffffff,%rcx
   e3201:	shlx   %rdx,%rcx,%rdi
   e3206:	not    %rdi
   e3209:	mov    $0x0,%ecx
   e320e:	cmove  %rdi,%rcx
   e3212:	vpcmpeqb %ymm6,%ymm3,%ymm4
   e3216:	vpmovmskb %ymm4,%r9d
   e321a:	vpcmpeqb %ymm6,%ymm2,%ymm4
   e321e:	vpmovmskb %ymm4,%esi
   e3222:	shl    $0x20,%rsi
   e3226:	or     %r9,%rsi
   e3229:	cmp    $0x1,%rax
   e322d:	mov    $0x0,%r12d
   e3233:	sbb    %r12,%r12
   e3236:	or     %rdi,%r12
   e3239:	vpcmpeqb %ymm7,%ymm3,%ymm3
   e323d:	vpmovmskb %ymm3,%ebx
   e3241:	vpcmpeqb %ymm7,%ymm2,%ymm2
   e3245:	mov    %r12,%r13
   e3248:	and    %rsi,%r13
   e324b:	vpcmpeqb %ymm6,%ymm1,%ymm3
   e324f:	vpmovmskb %ymm3,%r9d
   e3253:	vpcmpeqb %ymm6,%ymm0,%ymm3
   e3257:	vpmovmskb %ymm3,%edi
   e325b:	shl    $0x20,%rdi
   e325f:	or     %r9,%rdi
   e3262:	vpcmpeqb %ymm7,%ymm1,%ymm1
   e3266:	vpmovmskb %ymm1,%r9d
   e326a:	vpcmpeqb %ymm7,%ymm0,%ymm0
   e326e:	vpmovmskb %ymm0,%r10d
   e3272:	shl    $0x20,%r10
   e3276:	or     %r9,%r10
   e3279:	mov    %rcx,%r14
   e327c:	and    %rdi,%r14
   e327f:	popcnt %r13,%r9
   e3284:	popcnt %r14,%r15
   e3289:	add    %r9d,%r15d
   e328c:	vpmovmskb %ymm2,%r11d
   e3290:	shl    $0x20,%r11
   e3294:	mov    %rbx,0x28(%rsp)
   e3299:	or     %rbx,%r11
   e329c:	mov    0x98(%rsp),%r9
   e32a4:	lea    (%r9,%rbp,1),%rbx
   e32a8:	cmp    $0x6,%r15d
   e32ac:	mov    %rbx,0x48(%rsp)
   e32b1:	jne    e34c0 <sessions::fast::parse_events_avx2+0x4b20>
   e32b7:	blsr   %r13,%r9
   e32bc:	blsr   %r9,%r9
   e32c1:	tzcnt  %r9,%rbp
   e32c6:	cmp    $0x3f,%ebp
   e32c9:	ja     e34c0 <sessions::fast::parse_events_avx2+0x4b20>
   e32cf:	cmp    %ebp,%edx
   e32d1:	jbe    e34c0 <sessions::fast::parse_events_avx2+0x4b20>
   e32d7:	lea    0x1(%rbp),%r9d
   e32db:	mov    %edx,%r15d
   e32de:	sub    %r9d,%r15d
   e32e1:	cmp    $0x40,%r15d
   e32e5:	jae    e34c0 <sessions::fast::parse_events_avx2+0x4b20>
   e32eb:	mov    %rdx,0x60(%rsp)
   e32f0:	mov    %ebp,%eax
   e32f2:	and    $0x3f,%eax
   e32f5:	mov    $0x1,%edx
   e32fa:	shlx   %rax,%rdx,%rdx
   e32ff:	mov    $0xffffffffffffffff,%rsi
   e3306:	bzhi   %rax,%rsi,%rsi
   e330b:	bzhi   %rax,%r13,%rbx
   e3310:	shrx   %rax,%r13,%rdi
   e3315:	shr    $1,%rdi
   e3318:	mov    %eax,%r8d
   e331b:	xor    $0x3f,%rax
   e331f:	shlx   %rax,%r14,%r13
   e3324:	or     %rdi,%r13
   e3327:	and    %r10,%rcx
   e332a:	and    %r11,%r12
   e332d:	shrx   %r8,%r12,%rdi
   e3332:	shr    $1,%rdi
   e3335:	shlx   %rax,%rcx,%rax
   e333a:	or     %rdi,%rax
   e333d:	or     %rbx,%rdx
   e3340:	and    %rsi,%r12
   e3343:	lea    0x1(,%rbx,2),%r8
   e334b:	and    %r12,%r8
   e334e:	mov    %rdx,%rcx
   e3351:	shr    $1,%rcx
   e3354:	andn   %rcx,%rdx,%rcx
   e3359:	sub    %r8,%rdx
   e335c:	and    %rdx,%rcx
   e335f:	mov    %rcx,%rdx
   e3362:	or     %r8,%rdx
   e3365:	xor    %r12,%rdx
   e3368:	and    %r8,%rcx
   e336b:	or     %rdx,%rcx
   e336e:	mov    %r13,%rdx
   e3371:	bts    %r15,%rdx
   e3375:	lea    0x1(,%r13,2),%rdi
   e337d:	and    %rax,%rdi
   e3380:	mov    %rdx,%rsi
   e3383:	shr    $1,%rsi
   e3386:	andn   %rsi,%rdx,%rsi
   e338b:	sub    %rdi,%rdx
   e338e:	and    %rdx,%rsi
   e3391:	mov    %rsi,%rdx
   e3394:	or     %rdi,%rdx
   e3397:	xor    %rax,%rdx
   e339a:	and    %rdi,%rsi
   e339d:	or     %rcx,%rsi
   e33a0:	or     %rdx,%rsi
   e33a3:	jne    e4510 <sessions::fast::parse_events_avx2+0x5b70>
   e33a9:	mov    %rbx,%r10
   e33ac:	tzcnt  %rbx,%rdx
   e33b1:	lea    (%r12,%r12,1),%ecx
   e33b5:	and    $0x2,%ecx
   e33b8:	mov    %edx,%r14d
   e33bb:	sub    %ecx,%r14d
   e33be:	je     e4510 <sessions::fast::parse_events_avx2+0x5b70>
   e33c4:	mov    %r8,0x80(%rsp)
   e33cc:	mov    %r10,0x88(%rsp)
   e33d4:	mov    %rdi,0x40(%rsp)
   e33d9:	mov    %r15,0x38(%rsp)
   e33de:	mov    %rdx,0x68(%rsp)
   e33e3:	and    $0x1,%r12d
   e33e7:	mov    0x48(%rsp),%rcx
   e33ec:	mov    %r13,%rdx
   e33ef:	lea    (%rcx,%r12,1),%r13
   e33f3:	mov    %r9d,%esi
   e33f6:	add    %rcx,%rsi
   e33f9:	mov    %rdx,0x50(%rsp)
   e33fe:	tzcnt  %rdx,%r11
   e3403:	mov    %eax,%ecx
   e3405:	and    $0x1,%ecx
   e3408:	mov    %rcx,0x28(%rsp)
   e340d:	add    %eax,%eax
   e340f:	and    $0x2,%eax
   e3412:	mov    %r11,%r8
   e3415:	mov    0xe8(%rsp),%r9
   e341d:	incq   0x528(%rsp)
   e3425:	sub    %rax,%r8
   e3428:	mov    %r8d,%ebx
   e342b:	mov    0xf8(%rsp),%rdi
   e3433:	cmp    $0xc,%r14d
   e3437:	mov    %rsi,0x10(%rsp)
   e343c:	mov    %r11,0x20(%rsp)
   e3441:	jae    e38bf <sessions::fast::parse_events_avx2+0x4f1f>
   e3447:	mov    %r14,%rax
   e344a:	shl    $0x4,%rax
   e344e:	mov    0x0(%r13),%r10
   e3452:	lea    -0xc9621(%rip),%rdx        # 19e38 <sessions::fast::ids::MASKS>
   e3459:	and    (%rax,%rdx,1),%r10
   e345d:	mov    0x8(%r13),%rcx
   e3461:	and    0x8(%rax,%rdx,1),%rcx
   e3466:	shl    $0x38,%r14
   e346a:	mov    %r14,%r11
   e346d:	or     %rcx,%r11
   e3470:	movabs $0xff00000000000000,%rax
   e347a:	dec    %rax
   e347d:	cmp    %rax,%r11
   e3480:	movabs $0xe7037ed1a0b428db,%rcx
   e348a:	mov    %r10,%rax
   e348d:	ja     e3c94 <sessions::fast::parse_events_avx2+0x52f4>
   e3493:	movabs $0xa0761d6478bd642f,%rdx
   e349d:	xor    %rdx,%rax
   e34a0:	mov    %r11,%rdx
   e34a3:	xor    %rcx,%rdx
   e34a6:	mulx   %rax,%rcx,%rax
   e34ab:	xor    %rcx,%rax
   e34ae:	jmp    e3c94 <sessions::fast::parse_events_avx2+0x52f4>
   e34b3:	data16 data16 data16 cs nopw 0x0(%rax,%rax,1)
   e34c0:	or     %rax,%r8
   e34c3:	je     e5b49 <sessions::fast::parse_events_avx2+0x71a9>
   e34c9:	mov    0x60(%rsp),%r13
   e34ce:	add    $0x40,%r13
   e34d2:	test   %rax,%rax
   e34d5:	cmovne 0x10(%rsp),%r13
   e34db:	xor    %r8d,%r8d
   e34de:	mov    %r13d,%ecx
   e34e1:	mov    $0x1,%eax
   e34e6:	shld   %cl,%rax,%r8
   e34ea:	shlx   %r13,%rax,%rbx
   e34ef:	test   $0x40,%r13b
   e34f3:	cmovne %rbx,%r8
   e34f7:	mov    $0x0,%eax
   e34fc:	cmovne %rax,%rbx
   e3500:	mov    %rbx,%rcx
   e3503:	add    $0xffffffffffffffff,%rcx
   e3507:	mov    %r8,%r9
   e350a:	adc    $0xffffffffffffffff,%r9
   e350e:	and    %r9,%rdi
   e3511:	and    %rcx,%rsi
   e3514:	and    %r10,%r9
   e3517:	and    %r11,%rcx
   e351a:	or     %rdi,%r8
   e351d:	or     %rsi,%rbx
   e3520:	mov    %rdi,%rdx
   e3523:	shld   $0x1,%rsi,%rdx
   e3528:	lea    0x1(,%rsi,2),%rax
   e3530:	and    %r9,%rdx
   e3533:	and    %rcx,%rax
   e3536:	mov    %rbx,%r10
   e3539:	sub    %rax,%r10
   e353c:	mov    %r8,%r11
   e353f:	sbb    %rdx,%r11
   e3542:	test   %r13,%r13
   e3545:	je     e4fb0 <sessions::fast::parse_events_avx2+0x6610>
   e354b:	popcnt %rdi,%r14
   e3550:	popcnt %rsi,%r15
   e3555:	add    %r14,%r15
   e3558:	cmp    $0x6,%r15d
   e355c:	jne    e4fb0 <sessions::fast::parse_events_avx2+0x6610>
   e3562:	mov    %r8,%r14
   e3565:	shld   $0x3f,%rbx,%r14
   e356a:	mov    %r8,%r15
   e356d:	shr    $1,%r15
   e3570:	andn   %r15,%r8,%r8
   e3575:	and    %r11,%r8
   e3578:	andn   %r14,%rbx,%r11
   e357d:	and    %r10,%r11
   e3580:	mov    %r8,%r10
   e3583:	or     %rdx,%r10
   e3586:	mov    %r11,%rbx
   e3589:	or     %rax,%rbx
   e358c:	xor    %r9,%r10
   e358f:	xor    %rcx,%rbx
   e3592:	and    %rdx,%r8
   e3595:	or     %r10,%r8
   e3598:	and    %rax,%r11
   e359b:	or     %rbx,%r11
   e359e:	or     %r8,%r11
   e35a1:	jne    e4fb0 <sessions::fast::parse_events_avx2+0x6610>
   e35a7:	tzcnt  %rsi,%rcx
   e35ac:	tzcnt  %rdi,%r11
   e35b1:	add    $0x40,%r11d
   e35b5:	test   %rsi,%rsi
   e35b8:	cmovne %ecx,%r11d
   e35bc:	mov    %rsi,%r9
   e35bf:	add    $0xffffffffffffffff,%r9
   e35c3:	mov    %rdi,%r10
   e35c6:	adc    $0xffffffffffffffff,%r10
   e35ca:	and    %rdi,%r10
   e35cd:	and    %rsi,%r9
   e35d0:	mov    0x28(%rsp),%r12
   e35d5:	and    $0x1,%r12d
   e35d9:	tzcnt  %r9,%rcx
   e35de:	tzcnt  %r10,%r14
   e35e3:	add    $0x40,%r14d
   e35e7:	test   %r9,%r9
   e35ea:	cmovne %ecx,%r14d
   e35ee:	lea    0x1(%r11),%ecx
   e35f2:	mov    %r9,%rsi
   e35f5:	add    $0xffffffffffffffff,%rsi
   e35f9:	mov    %r10,%r8
   e35fc:	adc    $0xffffffffffffffff,%r8
   e3600:	mov    %rax,%rdi
   e3603:	shrd   %cl,%rdx,%rdi
   e3607:	and    %r10,%r8
   e360a:	and    %r9,%rsi
   e360d:	shrx   %rcx,%rdx,%rbx
   e3612:	test   $0x40,%cl
   e3615:	cmove  %rdi,%rbx
   e3619:	tzcnt  %rsi,%rcx
   e361e:	tzcnt  %r8,%r15
   e3623:	add    $0x40,%r15d
   e3627:	test   %rsi,%rsi
   e362a:	cmovne %ecx,%r15d
   e362e:	mov    %r14,0x80(%rsp)
   e3636:	lea    0x1(%r14),%ecx
   e363a:	mov    %rsi,%rdi
   e363d:	add    $0xffffffffffffffff,%rdi
   e3641:	mov    %r8,%r9
   e3644:	adc    $0xffffffffffffffff,%r9
   e3648:	mov    %rax,%r10
   e364b:	shrd   %cl,%rdx,%r10
   e364f:	and    %r8,%r9
   e3652:	and    %rsi,%rdi
   e3655:	shrx   %rcx,%rdx,%rsi
   e365a:	test   $0x40,%cl
   e365d:	cmove  %r10,%rsi
   e3661:	mov    %rsi,0x68(%rsp)
   e3666:	tzcnt  %rdi,%rcx
   e366b:	tzcnt  %r9,%r14
   e3670:	add    $0x40,%r14
   e3674:	test   %rdi,%rdi
   e3677:	cmovne %rcx,%r14
   e367b:	mov    %r15,0x10(%rsp)
   e3680:	lea    0x1(%r15),%ecx
   e3684:	mov    %rdi,%rsi
   e3687:	add    $0xffffffffffffffff,%rsi
   e368b:	mov    %r9,%r8
   e368e:	adc    $0xffffffffffffffff,%r8
   e3692:	mov    %rax,%r10
   e3695:	shrd   %cl,%rdx,%r10
   e3699:	and    %r9,%r8
   e369c:	and    %rdi,%rsi
   e369f:	shrx   %rcx,%rdx,%r15
   e36a4:	test   $0x40,%cl
   e36a7:	cmove  %r10,%r15
   e36ab:	tzcnt  %rsi,%rcx
   e36b0:	tzcnt  %r8,%rbp
   e36b5:	add    $0x40,%rbp
   e36b9:	test   %rsi,%rsi
   e36bc:	cmovne %rcx,%rbp
   e36c0:	lea    0x1(%r14),%ecx
   e36c4:	mov    %rsi,%rdi
   e36c7:	add    $0xffffffffffffffff,%rdi
   e36cb:	mov    %r8,%r9
   e36ce:	adc    $0xffffffffffffffff,%r9
   e36d2:	mov    %rax,%r10
   e36d5:	shrd   %cl,%rdx,%r10
   e36d9:	and    %r8,%r9
   e36dc:	and    %rsi,%rdi
   e36df:	test   $0x40,%cl
   e36e2:	shrx   %rcx,%rdx,%rcx
   e36e7:	cmove  %r10,%rcx
   e36eb:	mov    %rcx,0x50(%rsp)
   e36f0:	tzcnt  %rdi,%rsi
   e36f5:	tzcnt  %r9,%r10
   e36fa:	add    $0x40,%r10d
   e36fe:	test   %rdi,%rdi
   e3701:	mov    %rbp,0x40(%rsp)
   e3706:	lea    0x1(%rbp),%ecx
   e3709:	cmovne %esi,%r10d
   e370d:	mov    %rax,%rsi
   e3710:	shrd   %cl,%rdx,%rsi
   e3714:	test   $0x40,%cl
   e3717:	shrx   %rcx,%rdx,%rdi
   e371c:	cmove  %rsi,%rdi
   e3720:	lea    0x1(%r10),%ecx
   e3724:	shrd   %cl,%rdx,%rax
   e3728:	shrx   %rcx,%rdx,%rsi
   e372d:	test   $0x40,%cl
   e3730:	mov    %r12,0x28(%rsp)
   e3735:	lea    (%r12,%r12,1),%ecx
   e3739:	cmove  %rax,%rsi
   e373d:	mov    %r11d,%ebp
   e3740:	sub    %ecx,%ebp
   e3742:	je     e4fb0 <sessions::fast::parse_events_avx2+0x6610>
   e3748:	mov    %rdi,0x8(%rsp)
   e374d:	mov    %r13,0x60(%rsp)
   e3752:	mov    0xe8(%rsp),%r9
   e375a:	incq   0x528(%rsp)
   e3762:	mov    0x28(%rsp),%rax
   e3767:	mov    0x48(%rsp),%rcx
   e376c:	lea    (%rcx,%rax,1),%r13
   e3770:	mov    0xf8(%rsp),%rdi
   e3778:	cmp    $0xc,%ebp
   e377b:	mov    %r9,0x20(%rsp)
   e3780:	mov    %rdi,0xc8(%rsp)
   e3788:	mov    %r11,0x18(%rsp)
   e378d:	mov    %rbx,0x38(%rsp)
   e3792:	mov    %r10,0x70(%rsp)
   e3797:	mov    %rsi,0x30(%rsp)
   e379c:	jae    e380a <sessions::fast::parse_events_avx2+0x4e6a>
   e379e:	mov    %rbp,%rax
   e37a1:	shl    $0x4,%rax
   e37a5:	mov    0x0(%r13),%r10
   e37a9:	lea    -0xc9978(%rip),%rdx        # 19e38 <sessions::fast::ids::MASKS>
   e37b0:	and    (%rax,%rdx,1),%r10
   e37b4:	mov    0x8(%r13),%rcx
   e37b8:	and    0x8(%rax,%rdx,1),%rcx
   e37bd:	shl    $0x38,%rbp
   e37c1:	mov    %rbp,%r11
   e37c4:	or     %rcx,%r11
   e37c7:	movabs $0xff00000000000000,%rax
   e37d1:	dec    %rax
   e37d4:	cmp    %rax,%r11
   e37d7:	movabs $0xe7037ed1a0b428db,%rcx
   e37e1:	ja     e4690 <sessions::fast::parse_events_avx2+0x5cf0>
   e37e7:	mov    %r10,%rax
   e37ea:	movabs $0xa0761d6478bd642f,%rdx
   e37f4:	xor    %rdx,%rax
   e37f7:	mov    %r11,%rdx
   e37fa:	xor    %rcx,%rdx
   e37fd:	mulx   %rax,%rax,%rcx
   e3802:	xor    %rax,%rcx
   e3805:	jmp    e4693 <sessions::fast::parse_events_avx2+0x5cf3>
   e380a:	cmp    $0x100,%ebp
   e3810:	movabs $0xe7037ed1a0b428db,%r8
   e381a:	jae    e397d <sessions::fast::parse_events_avx2+0x4fdd>
   e3820:	cmp    %r13,0x518(%rsp)
   e3828:	ja     e397d <sessions::fast::parse_events_avx2+0x4fdd>
   e382e:	cmp    %r13,0x520(%rsp)
   e3836:	jbe    e397d <sessions::fast::parse_events_avx2+0x4fdd>
   e383c:	mov    %rbp,%rdx
   e383f:	movabs $0x589965cc75374cc3,%rax
   e3849:	imul   %rax,%rdx
   e384d:	movabs $0x8ebc6af09c88c6e3,%rax
   e3857:	xor    %rax,%rdx
   e385a:	lea    -0x8(%rbp),%rsi
   e385e:	shr    $0x3,%rsi
   e3862:	je     e4630 <sessions::fast::parse_events_avx2+0x5c90>
   e3868:	inc    %rsi
   e386b:	mov    %rsi,%r9
   e386e:	and    $0xfffffffffffffffe,%r9
   e3872:	mov    $0x8,%ecx
   e3877:	nopw   0x0(%rax,%rax,1)
   e3880:	mov    %rcx,%rax
   e3883:	xor    -0x8(%r13,%rcx,1),%rdx
   e3888:	mulx   %r8,%rcx,%rdx
   e388d:	xor    %rcx,%rdx
   e3890:	xor    0x0(%r13,%rax,1),%rdx
   e3895:	mulx   %r8,%rcx,%rdx
   e389a:	xor    %rcx,%rdx
   e389d:	lea    0x10(%rax),%rcx
   e38a1:	add    $0xfffffffffffffffe,%r9
   e38a5:	jne    e3880 <sessions::fast::parse_events_avx2+0x4ee0>
   e38a7:	add    $0x8,%rax
   e38ab:	test   $0x1,%sil
   e38af:	mov    0x20(%rsp),%r9
   e38b4:	jne    e4637 <sessions::fast::parse_events_avx2+0x5c97>
   e38ba:	jmp    e4647 <sessions::fast::parse_events_avx2+0x5ca7>
   e38bf:	mov    %r8,0x8(%rsp)
   e38c4:	cmp    $0x100,%r14d
   e38cb:	movabs $0xe7037ed1a0b428db,%r8
   e38d5:	jae    e3a48 <sessions::fast::parse_events_avx2+0x50a8>
   e38db:	cmp    %r13,0x518(%rsp)
   e38e3:	ja     e3a48 <sessions::fast::parse_events_avx2+0x50a8>
   e38e9:	cmp    %r13,0x520(%rsp)
   e38f1:	jbe    e3a48 <sessions::fast::parse_events_avx2+0x50a8>
   e38f7:	mov    %r14,%rdx
   e38fa:	movabs $0x589965cc75374cc3,%rax
   e3904:	imul   %rax,%rdx
   e3908:	movabs $0x8ebc6af09c88c6e3,%rax
   e3912:	xor    %rax,%rdx
   e3915:	lea    -0x8(%r14),%rsi
   e3919:	shr    $0x3,%rsi
   e391d:	je     e4fd4 <sessions::fast::parse_events_avx2+0x6634>
   e3923:	mov    %r9,%r10
   e3926:	inc    %rsi
   e3929:	mov    %rsi,%r9
   e392c:	and    $0xfffffffffffffffe,%r9
   e3930:	mov    $0x8,%ecx
   e3935:	mov    0x28(%rsp),%r15
   e393a:	mov    %rbx,%r12
   e393d:	nopl   (%rax)
   e3940:	mov    %rcx,%rax
   e3943:	xor    -0x8(%r13,%rcx,1),%rdx
   e3948:	mulx   %r8,%rcx,%rdx
   e394d:	xor    %rcx,%rdx
   e3950:	xor    0x0(%r13,%rax,1),%rdx
   e3955:	mulx   %r8,%rcx,%rdx
   e395a:	xor    %rcx,%rdx
   e395d:	lea    0x10(%rax),%rcx
   e3961:	add    $0xfffffffffffffffe,%r9
   e3965:	jne    e3940 <sessions::fast::parse_events_avx2+0x4fa0>
   e3967:	add    $0x8,%rax
   e396b:	test   $0x1,%sil
   e396f:	mov    %r10,%r9
   e3972:	jne    e4fe3 <sessions::fast::parse_events_avx2+0x6643>
   e3978:	jmp    e4ff3 <sessions::fast::parse_events_avx2+0x6653>
   e397d:	mov    %rbp,%rdx
   e3980:	movabs $0x589965cc75374cc3,%rax
   e398a:	imul   %rax,%rdx
   e398e:	movabs $0x8ebc6af09c88c6e3,%rax
   e3998:	xor    %rax,%rdx
   e399b:	xor    %eax,%eax
   e399d:	nopl   (%rax)
   e39a0:	mov    %rax,%rcx
   e39a3:	xor    0x0(%r13,%rax,1),%rdx
   e39a8:	mulx   %r8,%rax,%rdx
   e39ad:	xor    %rax,%rdx
   e39b0:	lea    0x8(%rcx),%rax
   e39b4:	add    $0x10,%rcx
   e39b8:	cmp    %rbp,%rcx
   e39bb:	jbe    e39a0 <sessions::fast::parse_events_avx2+0x5000>
   e39bd:	cmp    %rbp,%rax
   e39c0:	mov    %r14,0x78(%rsp)
   e39c5:	je     e39e2 <sessions::fast::parse_events_avx2+0x5042>
   e39c7:	mov    %ebp,%ecx
   e39c9:	neg    %ecx
   e39cb:	shl    $0x3,%ecx
   e39ce:	and    $0x38,%cl
   e39d1:	mov    $0x40,%esi
   e39d6:	sub    %ecx,%esi
   e39d8:	bzhi   %rsi,0x0(%r13,%rax,1),%rax
   e39df:	xor    %rax,%rdx
   e39e2:	movabs $0xa0761d6478bd642f,%rax
   e39ec:	mulx   %rax,%r12,%r10
   e39f1:	lea    0xf(%rbp),%rbx
   e39f5:	mov    %rbx,%r14
   e39f8:	movabs $0x1fffffff0,%rax
   e3a02:	and    %rax,%r14
   e3a05:	or     $0x8,%r14
   e3a09:	mov    (%rdi),%r11
   e3a0c:	mov    0x8(%rdi),%rax
   e3a10:	sub    %r11,%rax
   e3a13:	cmp    %r14,%rax
   e3a16:	jb     e6297 <sessions::fast::parse_events_avx2+0x78f7>
   e3a1c:	shr    $0x4,%rbx
   e3a20:	mov    %ebp,(%r11)
   e3a23:	movl   $0x0,0x4(%r11)
   e3a2b:	lea    -0x1(%rbx),%ecx
   e3a2e:	mov    %ebx,%eax
   e3a30:	and    $0x3,%eax
   e3a33:	cmp    $0x3,%ecx
   e3a36:	jae    e3b1b <sessions::fast::parse_events_avx2+0x517b>
   e3a3c:	xor    %ecx,%ecx
   e3a3e:	mov    0x28(%rsp),%rsi
   e3a43:	jmp    e3b7a <sessions::fast::parse_events_avx2+0x51da>
   e3a48:	mov    %r14,%rdx
   e3a4b:	movabs $0x589965cc75374cc3,%rax
   e3a55:	imul   %rax,%rdx
   e3a59:	movabs $0x8ebc6af09c88c6e3,%rax
   e3a63:	xor    %rax,%rdx
   e3a66:	xor    %eax,%eax
   e3a68:	nopl   0x0(%rax,%rax,1)
   e3a70:	mov    %rax,%rcx
   e3a73:	xor    0x0(%r13,%rax,1),%rdx
   e3a78:	mulx   %r8,%rax,%rdx
   e3a7d:	xor    %rax,%rdx
   e3a80:	lea    0x8(%rcx),%rax
   e3a84:	add    $0x10,%rcx
   e3a88:	cmp    %r14,%rcx
   e3a8b:	jbe    e3a70 <sessions::fast::parse_events_avx2+0x50d0>
   e3a8d:	cmp    %r14,%rax
   e3a90:	je     e3aae <sessions::fast::parse_events_avx2+0x510e>
   e3a92:	mov    %r14d,%ecx
   e3a95:	neg    %ecx
   e3a97:	shl    $0x3,%ecx
   e3a9a:	and    $0x38,%cl
   e3a9d:	mov    $0x40,%esi
   e3aa2:	sub    %ecx,%esi
   e3aa4:	bzhi   %rsi,0x0(%r13,%rax,1),%rax
   e3aab:	xor    %rax,%rdx
   e3aae:	mov    0x8(%rsp),%r8
   e3ab3:	movabs $0xa0761d6478bd642f,%rax
   e3abd:	mulx   %rax,%rax,%r10
   e3ac2:	mov    %rax,0x70(%rsp)
   e3ac7:	lea    0xf(%r14),%r15
   e3acb:	mov    %r15,%rsi
   e3ace:	movabs $0x1fffffff0,%rax
   e3ad8:	and    %rax,%rsi
   e3adb:	or     $0x8,%rsi
   e3adf:	mov    (%rdi),%r11
   e3ae2:	mov    0x8(%rdi),%rax
   e3ae6:	sub    %r11,%rax
   e3ae9:	cmp    %rsi,%rax
   e3aec:	jb     e65f0 <sessions::fast::parse_events_avx2+0x7c50>
   e3af2:	shr    $0x4,%r15
   e3af6:	mov    %r14d,(%r11)
   e3af9:	movl   $0x0,0x4(%r11)
   e3b01:	lea    -0x1(%r15),%ecx
   e3b05:	mov    %r15d,%eax
   e3b08:	and    $0x3,%eax
   e3b0b:	cmp    $0x3,%ecx
   e3b0e:	jae    e3bdb <sessions::fast::parse_events_avx2+0x523b>
   e3b14:	xor    %ecx,%ecx
   e3b16:	jmp    e3c38 <sessions::fast::parse_events_avx2+0x5298>
   e3b1b:	and    $0xfffffffc,%ebx
   e3b1e:	lea    0x8(%r11),%rdx
   e3b22:	mov    $0x30,%esi
   e3b27:	xor    %ecx,%ecx
   e3b29:	nopl   0x0(%rax)
   e3b30:	vmovups -0x30(%r13,%rsi,1),%xmm0
   e3b37:	vmovups %xmm0,-0x30(%rdx,%rsi,1)
   e3b3d:	vmovups -0x20(%r13,%rsi,1),%xmm0
   e3b44:	vmovups %xmm0,-0x20(%rdx,%rsi,1)
   e3b4a:	vmovups -0x10(%r13,%rsi,1),%xmm0
   e3b51:	vmovups %xmm0,-0x10(%rdx,%rsi,1)
   e3b57:	add    $0x4,%rcx
   e3b5b:	vmovdqu 0x0(%r13,%rsi,1),%xmm0
   e3b62:	vmovdqu %xmm0,(%rdx,%rsi,1)
   e3b67:	add    $0x40,%rsi
   e3b6b:	cmp    %rcx,%rbx
   e3b6e:	jne    e3b30 <sessions::fast::parse_events_avx2+0x5190>
   e3b70:	test   %rax,%rax
   e3b73:	mov    0x28(%rsp),%rsi
   e3b78:	je     e3bb3 <sessions::fast::parse_events_avx2+0x5213>
   e3b7a:	shl    $0x4,%rcx
   e3b7e:	lea    (%r11,%rcx,1),%rdx
   e3b82:	add    $0x8,%rdx
   e3b86:	add    0x98(%rsp),%rsi
   e3b8e:	add    0xd0(%rsp),%rsi
   e3b96:	add    %rcx,%rsi
   e3b99:	shl    $0x4,%eax
   e3b9c:	xor    %ecx,%ecx
   e3b9e:	xchg   %ax,%ax
   e3ba0:	vmovdqu (%rsi,%rcx,1),%xmm0
   e3ba5:	vmovdqu %xmm0,(%rdx,%rcx,1)
   e3baa:	add    $0x10,%rcx
   e3bae:	cmp    %rcx,%rax
   e3bb1:	jne    e3ba0 <sessions::fast::parse_events_avx2+0x5200>
   e3bb3:	xor    %r12,%r10
   e3bb6:	add    %r11,%r14
   e3bb9:	mov    %r14,(%rdi)
   e3bbc:	movabs $0xff00000000000000,%rax
   e3bc6:	or     %rax,%r11
   e3bc9:	mov    %r10,%rcx
   e3bcc:	mov    0x60(%rsp),%r13
   e3bd1:	mov    0x78(%rsp),%r14
   e3bd6:	jmp    e4698 <sessions::fast::parse_events_avx2+0x5cf8>
   e3bdb:	mov    %rsi,%r14
   e3bde:	and    $0xfffffffc,%r15d
   e3be2:	lea    0x8(%r11),%rdx
   e3be6:	mov    $0x30,%esi
   e3beb:	xor    %ecx,%ecx
   e3bed:	nopl   (%rax)
   e3bf0:	vmovups -0x30(%r13,%rsi,1),%xmm0
   e3bf7:	vmovups %xmm0,-0x30(%rdx,%rsi,1)
   e3bfd:	vmovups -0x20(%r13,%rsi,1),%xmm0
   e3c04:	vmovups %xmm0,-0x20(%rdx,%rsi,1)
   e3c0a:	vmovups -0x10(%r13,%rsi,1),%xmm0
   e3c11:	vmovups %xmm0,-0x10(%rdx,%rsi,1)
   e3c17:	add    $0x4,%rcx
   e3c1b:	vmovdqu 0x0(%r13,%rsi,1),%xmm0
   e3c22:	vmovdqu %xmm0,(%rdx,%rsi,1)
   e3c27:	add    $0x40,%rsi
   e3c2b:	cmp    %rcx,%r15
   e3c2e:	jne    e3bf0 <sessions::fast::parse_events_avx2+0x5250>
   e3c30:	test   %rax,%rax
   e3c33:	mov    %r14,%rsi
   e3c36:	je     e3c74 <sessions::fast::parse_events_avx2+0x52d4>
   e3c38:	shl    $0x4,%rcx
   e3c3c:	lea    (%r11,%rcx,1),%rdx
   e3c40:	add    $0x8,%rdx
   e3c44:	add    0x98(%rsp),%r12
   e3c4c:	add    0xd0(%rsp),%r12
   e3c54:	add    %rcx,%r12
   e3c57:	shl    $0x4,%eax
   e3c5a:	xor    %ecx,%ecx
   e3c5c:	nopl   0x0(%rax)
   e3c60:	vmovdqu (%r12,%rcx,1),%xmm0
   e3c66:	vmovdqu %xmm0,(%rdx,%rcx,1)
   e3c6b:	add    $0x10,%rcx
   e3c6f:	cmp    %rcx,%rax
   e3c72:	jne    e3c60 <sessions::fast::parse_events_avx2+0x52c0>
   e3c74:	xor    0x70(%rsp),%r10
   e3c79:	add    %r11,%rsi
   e3c7c:	mov    %rsi,(%rdi)
   e3c7f:	movabs $0xff00000000000000,%rax
   e3c89:	or     %rax,%r11
   e3c8c:	mov    %r10,%rax
   e3c8f:	mov    0x10(%rsp),%rsi
   e3c94:	mov    0x28(%rsp),%r15
   e3c99:	mov    %rbx,%r12
   e3c9c:	add    %rsi,%r15
   e3c9f:	movzbl 0x9a8(%r9),%ecx
   e3ca7:	xor    %edx,%edx
   e3ca9:	sub    %cl,%dl
   e3cab:	shrx   %rdx,%rax,%r13
   e3cb0:	cmp    $0x19,%r8
   e3cb4:	je     e3e37 <sessions::fast::parse_events_avx2+0x5497>
   e3cba:	cmp    $0x14,%r8d
   e3cbe:	jne    e4070 <sessions::fast::parse_events_avx2+0x56d0>
   e3cc4:	mov    %r15,%rbx
   e3cc7:	cmpb   $0x5a,0x13(%r15)
   e3ccc:	jne    e414f <sessions::fast::parse_events_avx2+0x57af>
   e3cd2:	mov    %rdi,0x30(%rsp)
   e3cd7:	mov    (%rbx),%rdx
   e3cda:	mov    0x930(%r9),%rcx
   e3ce1:	imul   %rdx,%rcx
   e3ce5:	shr    $0x3c,%rcx
   e3ce9:	cmp    %rdx,0x6e8(%r9,%rcx,8)
   e3cf1:	mov    %r11,0x70(%rsp)
   e3cf6:	mov    %r9,0x18(%rsp)
   e3cfb:	mov    %r10,%r14
   e3cfe:	jne    e6878 <sessions::fast::parse_events_avx2+0x7ed8>
   e3d04:	mov    0x768(%r9,%rcx,8),%rax
   e3d0c:	mov    0x7e8(%r9,%rcx,8),%rcx
   e3d14:	movabs $0x7676767676767676,%r9
   e3d1e:	movzwl 0x8(%rbx),%edx
   e3d22:	xor    $0x3030,%rdx
   e3d29:	mov    0xb(%rbx),%rdi
   e3d2d:	mov    %rdi,%rsi
   e3d30:	movabs $0x3030303030303030,%r8
   e3d3a:	xor    %r8,%rsi
   e3d3d:	lea    0x7676(%rdx),%r8d
   e3d44:	or     %edx,%r8d
   e3d47:	and    $0x8080,%r8d
   e3d4e:	add    %rsi,%r9
   e3d51:	or     %rdi,%r9
   e3d54:	movabs $0x8080008080008080,%r10
   e3d5e:	and    %r10,%r9
   e3d61:	xor    %r10d,%r10d
   e3d64:	cmpb   $0x54,0xa(%rbx)
   e3d68:	setne  %r10b
   e3d6c:	movabs $0xff0000ff0000,%r11
   e3d76:	and    %r11,%rdi
   e3d79:	or     %r10,%rdi
   e3d7c:	or     %r9,%rdi
   e3d7f:	or     %r8,%rdi
   e3d82:	movabs $0x3a00003a0000,%r8
   e3d8c:	cmp    %r8,%rdi
   e3d8f:	jne    e4619 <sessions::fast::parse_events_avx2+0x5c79>
   e3d95:	mov    $0xffffffff,%edi
   e3d9a:	mov    %rdi,0x28(%rsp)
   e3d9f:	lea    (%rsi,%rsi,4),%rdi
   e3da3:	shr    $0x8,%rsi
   e3da7:	lea    (%rsi,%rdi,2),%r8
   e3dab:	mov    %r8,%rsi
   e3dae:	shr    $0x30,%rsi
   e3db2:	movzbl %sil,%esi
   e3db6:	cmp    $0x3b,%rsi
   e3dba:	mov    %r14,%r10
   e3dbd:	mov    0x70(%rsp),%r11
   e3dc2:	ja     e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e3dc8:	mov    %r8d,%edi
   e3dcb:	shr    $0x18,%edi
   e3dce:	cmp    $0x3b,%edi
   e3dd1:	ja     e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e3dd7:	movzbl %r8b,%r8d
   e3ddb:	cmp    $0x17,%r8d
   e3ddf:	ja     e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e3de5:	movzbl %dl,%r9d
   e3de9:	lea    (%r9,%r9,4),%r9
   e3ded:	shr    $0x8,%edx
   e3df0:	lea    (%rdx,%r9,2),%rdx
   e3df4:	test   %rdx,%rdx
   e3df7:	je     e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e3dfd:	cmp    %rcx,%rdx
   e3e00:	jg     e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e3e06:	add    %rax,%rdx
   e3e09:	imul   $0x15180,%rdx,%rax
   e3e10:	imul   $0xe10,%r8,%rcx
   e3e17:	imul   $0x3c,%rdi,%rdx
   e3e1b:	add    %rsi,%rcx
   e3e1e:	add    %rdx,%rcx
   e3e21:	add    %rax,%rcx
   e3e24:	imul   $0x3e8,%rcx,%r14
   e3e2b:	add    $0xfffffffffad9a400,%r14
   e3e32:	jmp    e41c6 <sessions::fast::parse_events_avx2+0x5826>
   e3e37:	mov    %r15,%rbx
   e3e3a:	movzbl 0x13(%r15),%r15d
   e3e3f:	cmp    $0x2b,%r15d
   e3e43:	je     e3e4f <sessions::fast::parse_events_avx2+0x54af>
   e3e45:	cmp    $0x2d,%r15d
   e3e49:	jne    e414f <sessions::fast::parse_events_avx2+0x57af>
   e3e4f:	mov    %r13,0x8(%rsp)
   e3e54:	mov    (%rbx),%rdx
   e3e57:	mov    0x930(%r9),%rcx
   e3e5e:	imul   %rdx,%rcx
   e3e62:	shr    $0x3c,%rcx
   e3e66:	cmp    %rdx,0x6e8(%r9,%rcx,8)
   e3e6e:	mov    %rdi,0x30(%rsp)
   e3e73:	mov    %r9,0x18(%rsp)
   e3e78:	mov    %r11,%r13
   e3e7b:	mov    %r10,%r14
   e3e7e:	jne    e6727 <sessions::fast::parse_events_avx2+0x7d87>
   e3e84:	mov    0x768(%r9,%rcx,8),%rax
   e3e8c:	mov    0x7e8(%r9,%rcx,8),%rdx
   e3e94:	movzwl 0x8(%rbx),%r8d
   e3e99:	xor    $0x3030,%r8
   e3ea0:	mov    0xb(%rbx),%rsi
   e3ea4:	mov    %rsi,%rcx
   e3ea7:	movabs $0x3030303030303030,%rdi
   e3eb1:	xor    %rdi,%rcx
   e3eb4:	lea    0x7676(%r8),%edi
   e3ebb:	or     %r8d,%edi
   e3ebe:	and    $0x8080,%edi
   e3ec4:	movabs $0x7676767676767676,%r9
   e3ece:	add    %rcx,%r9
   e3ed1:	or     %rsi,%r9
   e3ed4:	movabs $0x8080008080008080,%r10
   e3ede:	and    %r10,%r9
   e3ee1:	xor    %r10d,%r10d
   e3ee4:	cmpb   $0x54,0xa(%rbx)
   e3ee8:	setne  %r10b
   e3eec:	movabs $0xff0000ff0000,%r11
   e3ef6:	and    %r11,%rsi
   e3ef9:	or     %r10,%rsi
   e3efc:	or     %r9,%rsi
   e3eff:	or     %rdi,%rsi
   e3f02:	movabs $0x3a00003a0000,%rdi
   e3f0c:	cmp    %rdi,%rsi
   e3f0f:	jne    e443e <sessions::fast::parse_events_avx2+0x5a9e>
   e3f15:	mov    $0xffffffff,%esi
   e3f1a:	mov    %rsi,0x28(%rsp)
   e3f1f:	lea    (%rcx,%rcx,4),%rsi
   e3f23:	shr    $0x8,%rcx
   e3f27:	lea    (%rcx,%rsi,2),%rdi
   e3f2b:	mov    %rdi,%rcx
   e3f2e:	shr    $0x30,%rcx
   e3f32:	movzbl %cl,%ecx
   e3f35:	cmp    $0x3b,%rcx
   e3f39:	mov    %r14,%r10
   e3f3c:	mov    %r13,%r11
   e3f3f:	ja     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e3f45:	mov    %edi,%esi
   e3f47:	shr    $0x18,%esi
   e3f4a:	cmp    $0x3b,%esi
   e3f4d:	mov    0x8(%rsp),%r13
   e3f52:	ja     e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e3f58:	movzbl %dil,%edi
   e3f5c:	cmp    $0x17,%edi
   e3f5f:	ja     e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e3f65:	movzbl %r8b,%r9d
   e3f69:	lea    (%r9,%r9,4),%r9
   e3f6d:	shr    $0x8,%r8d
   e3f71:	lea    (%r8,%r9,2),%r8
   e3f75:	test   %r8,%r8
   e3f78:	je     e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e3f7e:	cmp    %rdx,%r8
   e3f81:	jg     e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e3f87:	cmpb   $0x3a,0x16(%rbx)
   e3f8b:	jne    e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e3f91:	movzbl 0x14(%rbx),%edx
   e3f95:	add    $0xd0,%dl
   e3f98:	cmp    $0x9,%dl
   e3f9b:	ja     e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e3fa1:	movzbl 0x15(%rbx),%r9d
   e3fa6:	add    $0xd0,%r9b
   e3faa:	cmp    $0x9,%r9b
   e3fae:	ja     e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e3fb4:	mov    %r11,%r13
   e3fb7:	movzbl 0x17(%rbx),%r11d
   e3fbc:	add    $0xd0,%r11b
   e3fc0:	cmp    $0x9,%r11b
   e3fc4:	ja     e444b <sessions::fast::parse_events_avx2+0x5aab>
   e3fca:	mov    %r10,%r14
   e3fcd:	movzbl 0x18(%rbx),%r10d
   e3fd2:	add    $0xd0,%r10b
   e3fd6:	cmp    $0x9,%r10b
   e3fda:	ja     e4448 <sessions::fast::parse_events_avx2+0x5aa8>
   e3fe0:	movzbl %dl,%edx
   e3fe3:	add    %edx,%edx
   e3fe5:	lea    (%rdx,%rdx,4),%edx
   e3fe8:	add    %r9b,%dl
   e3feb:	cmp    $0x17,%dl
   e3fee:	ja     e4448 <sessions::fast::parse_events_avx2+0x5aa8>
   e3ff4:	movzbl %r11b,%r9d
   e3ff8:	add    %r9d,%r9d
   e3ffb:	lea    (%r9,%r9,4),%r9d
   e3fff:	add    %r10b,%r9b
   e4002:	cmp    $0x3b,%r9b
   e4006:	mov    %r14,%r10
   e4009:	mov    %r13,%r11
   e400c:	mov    0x8(%rsp),%r13
   e4011:	ja     e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e4017:	add    %rax,%r8
   e401a:	imul   $0x15180,%r8,%rax
   e4021:	imul   $0xe10,%rdi,%rdi
   e4028:	imul   $0x3c,%rsi,%rsi
   e402c:	add    %rcx,%rdi
   e402f:	add    %rsi,%rdi
   e4032:	add    %rax,%rdi
   e4035:	imul   $0x3e8,%rdi,%rax
   e403c:	add    $0xfffffffffad9a400,%rax
   e4042:	movzbl %r9b,%ecx
   e4046:	movzbl %dl,%edx
   e4049:	imul   $0x36ee80,%rdx,%rdx
   e4050:	imul   $0xea60,%rcx,%rcx
   e4057:	add    %rdx,%rcx
   e405a:	mov    %rcx,%r14
   e405d:	neg    %r14
   e4060:	cmp    $0x2b,%r15b
   e4064:	cmovne %rcx,%r14
   e4068:	add    %rax,%r14
   e406b:	jmp    e41c6 <sessions::fast::parse_events_avx2+0x5826>
   e4070:	lea    -0x1(%r12),%rax
   e4075:	cmp    $0x10,%rax
   e4079:	jae    e4143 <sessions::fast::parse_events_avx2+0x57a3>
   e407f:	mov    %r8,%rdx
   e4082:	mov    %r9,0x18(%rsp)
   e4087:	mov    %rdi,0x30(%rsp)
   e408c:	cmp    $0x9,%r12d
   e4090:	movabs $0x8080808080808080,%rdi
   e409a:	movabs $0x7676767676767676,%r8
   e40a4:	movabs $0x3030303030303030,%r9
   e40ae:	jae    e4538 <sessions::fast::parse_events_avx2+0x5b98>
   e40b4:	lea    0x0(,%r12,8),%eax
   e40bc:	cmp    $0x8,%r12
   e40c0:	shrx   %rax,%r9,%rcx
   e40c5:	mov    $0x0,%eax
   e40ca:	cmovne %rcx,%rax
   e40ce:	neg    %dl
   e40d0:	shl    $0x3,%dl
   e40d3:	shlx   %rdx,(%r15),%rcx
   e40d8:	or     %rcx,%rax
   e40db:	xor    %r9,%rax
   e40de:	lea    (%rax,%r8,1),%rdx
   e40e2:	or     %rcx,%rdx
   e40e5:	mov    $0xffffffff,%ecx
   e40ea:	mov    %rcx,0x28(%rsp)
   e40ef:	test   %rdi,%rdx
   e40f2:	jne    e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e40f8:	lea    (%rax,%rax,4),%rcx
   e40fc:	shr    $0x8,%rax
   e4100:	lea    (%rax,%rcx,2),%r14
   e4104:	mov    %r14,%rax
   e4107:	movabs $0xff000000ff,%rcx
   e4111:	and    %rcx,%rax
   e4114:	movabs $0xf424000000064,%rdx
   e411e:	imul   %rdx,%rax
   e4122:	shr    $0x10,%r14
   e4126:	and    %rcx,%r14
   e4129:	movabs $0x271000000001,%rcx
   e4133:	imul   %rcx,%r14
   e4137:	add    %rax,%r14
   e413a:	shr    $0x20,%r14
   e413e:	jmp    e41c6 <sessions::fast::parse_events_avx2+0x5826>
   e4143:	mov    %r15,%rbx
   e4146:	test   %r12,%r12
   e4149:	je     e4432 <sessions::fast::parse_events_avx2+0x5a92>
   e414f:	xor    %eax,%eax
   e4151:	xor    %edx,%edx
   e4153:	xor    %ecx,%ecx
   e4155:	xor    %r14d,%r14d
   e4158:	nopl   0x0(%rax,%rax,1)
   e4160:	movzbl (%rbx,%rdx,1),%esi
   e4164:	add    $0xd0,%sil
   e4168:	cmp    $0x9,%sil
   e416c:	ja     e4432 <sessions::fast::parse_events_avx2+0x5a92>
   e4172:	test   %sil,%sil
   e4175:	setne  %r8b
   e4179:	or     %r8b,%al
   e417c:	movzbl %al,%r8d
   e4180:	and    $0x1,%r8d
   e4184:	add    %r8d,%ecx
   e4187:	lea    (%r14,%r14,4),%r8
   e418b:	movzbl %sil,%esi
   e418f:	lea    (%rsi,%r8,2),%r14
   e4193:	inc    %rdx
   e4196:	cmp    %rdx,%r12
   e4199:	jne    e4160 <sessions::fast::parse_events_avx2+0x57c0>
   e419b:	mov    %r9,0x18(%rsp)
   e41a0:	mov    $0xffffffff,%eax
   e41a5:	mov    %rax,0x28(%rsp)
   e41aa:	mov    %rdi,0x30(%rsp)
   e41af:	cmp    $0x14,%ecx
   e41b2:	setb   %al
   e41b5:	test   %r14,%r14
   e41b8:	setns  %cl
   e41bb:	and    %al,%cl
   e41bd:	cmp    $0x1,%cl
   e41c0:	jne    e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e41c6:	mov    %r14,%rax
   e41c9:	mov    0x18(%rsp),%r9
   e41ce:	sub    0x950(%r9),%rax
   e41d5:	mov    %rax,%rdx
   e41d8:	shr    $0x3,%rdx
   e41dc:	movabs $0x20c49ba5e353f7cf,%rcx
   e41e6:	mulx   %rcx,%rsi,%rsi
   e41eb:	movabs $0x3e7fffffc18,%rcx
   e41f5:	cmp    %rcx,%rax
   e41f8:	mov    %r13,0x8(%rsp)
   e41fd:	jae    e420f <sessions::fast::parse_events_avx2+0x586f>
   e41ff:	shr    $0x4,%rsi
   e4203:	imul   $0x3e8,%rsi,%rcx
   e420a:	cmp    %rcx,%rax
   e420d:	je     e421c <sessions::fast::parse_events_avx2+0x587c>
   e420f:	movb   $0x1,0x530(%rsp)
   e4217:	mov    $0xffffffff,%esi
   e421c:	mov    0x68(%rsp),%rdx
   e4221:	mov    0x40(%rsp),%rdi
   e4226:	blsr   0x88(%rsp),%rax
   e4230:	tzcnt  %rax,%rax
   e4235:	lea    0x1(%rdx),%ecx
   e4238:	shrx   %rcx,0x80(%rsp),%rbx
   e4242:	and    $0x1,%ebx
   e4245:	lea    (%rdx,%rbx,2),%ecx
   e4248:	inc    %ecx
   e424a:	mov    %eax,%r8d
   e424d:	sub    %ecx,%r8d
   e4250:	mov    0x50(%rsp),%rcx
   e4255:	mov    %rsi,0x28(%rsp)
   e425a:	je     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e4260:	blsr   %rcx,%rcx
   e4265:	blsr   %rcx,%rdx
   e426a:	tzcnt  %rcx,%r15
   e426f:	tzcnt  %rdx,%rdx
   e4274:	lea    0x1(%r15),%ecx
   e4278:	shrx   %rcx,%rdi,%r13
   e427d:	and    $0x1,%r13d
   e4281:	lea    (%r15,%r13,2),%ecx
   e4285:	inc    %ecx
   e4287:	cmp    %ecx,%edx
   e4289:	je     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e428f:	mov    %ecx,0x78(%rsp)
   e4293:	mov    %rbx,0xc8(%rsp)
   e429b:	lea    0x1(%rax),%ecx
   e429e:	shrx   %rcx,0x80(%rsp),%rcx
   e42a8:	and    $0x1,%ecx
   e42ab:	lea    (%rcx,%rax,1),%ebx
   e42ae:	inc    %ebx
   e42b0:	lea    (%rax,%rcx,2),%ecx
   e42b3:	inc    %ecx
   e42b5:	mov    %ebp,%eax
   e42b7:	sub    %ecx,%eax
   e42b9:	mov    0x48(%rsp),%rdi
   e42be:	add    %rdi,%rbx
   e42c1:	cmp    $0x19,%rax
   e42c5:	mov    %r8,0x88(%rsp)
   e42cd:	mov    %rdx,0x50(%rsp)
   e42d2:	je     e5327 <sessions::fast::parse_events_avx2+0x6987>
   e42d8:	cmp    $0x14,%eax
   e42db:	jne    e554b <sessions::fast::parse_events_avx2+0x6bab>
   e42e1:	cmpb   $0x5a,0x13(%rbx)
   e42e5:	jne    e5686 <sessions::fast::parse_events_avx2+0x6ce6>
   e42eb:	mov    (%rbx),%rdx
   e42ee:	mov    0x930(%r9),%rcx
   e42f5:	imul   %rdx,%rcx
   e42f9:	shr    $0x3c,%rcx
   e42fd:	cmp    %rdx,0x6e8(%r9,%rcx,8)
   e4305:	mov    %r9,0x18(%rsp)
   e430a:	mov    %r11,%r12
   e430d:	mov    %r10,%rbp
   e4310:	jne    e70c5 <sessions::fast::parse_events_avx2+0x8725>
   e4316:	mov    0x768(%r9,%rcx,8),%rax
   e431e:	mov    0x7e8(%r9,%rcx,8),%rcx
   e4326:	movabs $0x7676767676767676,%r9
   e4330:	movzwl 0x8(%rbx),%edx
   e4334:	xor    $0x3030,%rdx
   e433b:	mov    0xb(%rbx),%rdi
   e433f:	mov    %rdi,%rsi
   e4342:	movabs $0x3030303030303030,%r8
   e434c:	xor    %r8,%rsi
   e434f:	lea    0x7676(%rdx),%r8d
   e4356:	or     %edx,%r8d
   e4359:	and    $0x8080,%r8d
   e4360:	add    %rsi,%r9
   e4363:	or     %rdi,%r9
   e4366:	movabs $0x8080008080008080,%r10
   e4370:	and    %r10,%r9
   e4373:	xor    %r10d,%r10d
   e4376:	cmpb   $0x54,0xa(%rbx)
   e437a:	setne  %r10b
   e437e:	movabs $0xff0000ff0000,%r11
   e4388:	and    %r11,%rdi
   e438b:	or     %r10,%rdi
   e438e:	or     %r9,%rdi
   e4391:	or     %r8,%rdi
   e4394:	movabs $0x3a00003a0000,%r8
   e439e:	cmp    %r8,%rdi
   e43a1:	jne    e713b <sessions::fast::parse_events_avx2+0x879b>
   e43a7:	lea    (%rsi,%rsi,4),%rdi
   e43ab:	shr    $0x8,%rsi
   e43af:	lea    (%rsi,%rdi,2),%r8
   e43b3:	mov    %r8,%rsi
   e43b6:	shr    $0x30,%rsi
   e43ba:	movzbl %sil,%esi
   e43be:	cmp    $0x3b,%rsi
   e43c2:	mov    %rbp,%r10
   e43c5:	mov    %r12,%r11
   e43c8:	ja     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e43ce:	mov    %r8d,%edi
   e43d1:	shr    $0x18,%edi
   e43d4:	cmp    $0x3b,%edi
   e43d7:	ja     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e43d9:	movzbl %r8b,%r8d
   e43dd:	cmp    $0x17,%r8d
   e43e1:	ja     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e43e3:	movzbl %dl,%r9d
   e43e7:	lea    (%r9,%r9,4),%r9
   e43eb:	shr    $0x8,%edx
   e43ee:	lea    (%rdx,%r9,2),%rdx
   e43f2:	test   %rdx,%rdx
   e43f5:	je     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e43f7:	cmp    %rcx,%rdx
   e43fa:	jg     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e43fc:	add    %rax,%rdx
   e43ff:	imul   $0x15180,%rdx,%rax
   e4406:	imul   $0xe10,%r8,%rcx
   e440d:	imul   $0x3c,%rdi,%rdx
   e4411:	add    %rsi,%rcx
   e4414:	add    %rdx,%rcx
   e4417:	add    %rax,%rcx
   e441a:	imul   $0x3e8,%rcx,%rbp
   e4421:	add    $0xfffffffffad9a400,%rbp
   e4428:	mov    0x18(%rsp),%r9
   e442d:	jmp    e5949 <sessions::fast::parse_events_avx2+0x6fa9>
   e4432:	mov    $0xffffffff,%eax
   e4437:	mov    %rax,0x28(%rsp)
   e443c:	jmp    e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e443e:	mov    $0xffffffff,%eax
   e4443:	mov    %rax,0x28(%rsp)
   e4448:	mov    %r14,%r10
   e444b:	mov    %r13,%r11
   e444e:	mov    0x8(%rsp),%r13
   e4453:	mov    0xf0(%rsp),%rsi
   e445b:	mov    0x108(%rsp),%rbx
   e4463:	mov    0x68(%rbx),%rax
   e4467:	movzbl (%rax,%r13,1),%edx
   e446c:	mov    %r13,%r14
   e446f:	shl    $0x6,%r14
   e4473:	add    0x50(%rbx),%r14
   e4477:	lea    0x1(%rdx),%rcx
   e447b:	shl    $0x5,%edx
   e447e:	mov    %r10,(%rdx,%r14,1)
   e4482:	mov    %r11,0x8(%rdx,%r14,1)
   e4487:	movabs $0xffffffff00000000,%rdi
   e4491:	mov    %rdi,0x10(%rdx,%r14,1)
   e4496:	movl   $0x0,0x18(%rdx,%r14,1)
   e449f:	mov    0x28(%rsp),%rdi
   e44a4:	mov    %edi,0x1c(%rdx,%r14,1)
   e44a9:	cmp    $0x2,%rcx
   e44ad:	jne    e4504 <sessions::fast::parse_events_avx2+0x5b64>
   e44af:	movb   $0x0,(%rax,%r13,1)
   e44b4:	mov    0x8(%rbx),%rax
   e44b8:	mov    0x20(%rbx),%rdx
   e44bc:	mov    (%rax,%r13,8),%rcx
   e44c0:	cmp    (%rdx,%r13,8),%rcx
   e44c4:	je     e62e2 <sessions::fast::parse_events_avx2+0x7942>
   e44ca:	vmovaps (%r14),%xmm0
   e44cf:	movntdq %xmm0,(%rcx)
   e44d3:	lea    0x10(%rcx),%rdx
   e44d7:	vmovaps 0x10(%r14),%xmm0
   e44dd:	movntdq %xmm0,(%rdx)
   e44e1:	lea    0x20(%rcx),%rdx
   e44e5:	vmovaps 0x20(%r14),%xmm0
   e44eb:	movntdq %xmm0,(%rdx)
   e44ef:	add    $0x30,%rcx
   e44f3:	vmovdqa 0x30(%r14),%xmm0
   e44f9:	movntdq %xmm0,(%rcx)
   e44fd:	addq   $0x40,(%rax,%r13,8)
   e4502:	jmp    e4510 <sessions::fast::parse_events_avx2+0x5b70>
   e4504:	mov    %cl,(%rax,%r13,1)
   e4508:	nopl   0x0(%rax,%rax,1)
   e4510:	mov    0x60(%rsp),%eax
   e4514:	mov    0x98(%rsp),%rcx
   e451c:	add    %rcx,%rax
   e451f:	inc    %rax
   e4522:	mov    0xa8(%rsp),%r12
   e452a:	cmp    %r12,%rax
   e452d:	jb     e3180 <sessions::fast::parse_events_avx2+0x47e0>
   e4533:	jmp    e307d <sessions::fast::parse_events_avx2+0x46dd>
   e4538:	lea    -0x8(%r12),%rcx
   e453d:	lea    0x0(,%rcx,8),%eax
   e4544:	cmp    $0x10,%r12
   e4548:	shrx   %rax,%r9,%rax
   e454d:	mov    $0x0,%edx
   e4552:	cmovae %rdx,%rax
   e4556:	mov    %ecx,%edx
   e4558:	neg    %dl
   e455a:	shl    $0x3,%dl
   e455d:	shlx   %rdx,(%r15),%rdx
   e4562:	or     %rdx,%rax
   e4565:	xor    %r9,%rax
   e4568:	lea    (%rax,%r8,1),%rsi
   e456c:	or     %rdx,%rsi
   e456f:	mov    $0xffffffff,%edx
   e4574:	mov    %rdx,0x28(%rsp)
   e4579:	test   %rdi,%rsi
   e457c:	jne    e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e4582:	mov    (%r15,%rcx,1),%rdx
   e4586:	mov    %rdx,%rcx
   e4589:	xor    %r9,%rcx
   e458c:	lea    (%rcx,%r8,1),%rsi
   e4590:	or     %rdx,%rsi
   e4593:	test   %rdi,%rsi
   e4596:	jne    e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e459c:	lea    (%rax,%rax,4),%rdx
   e45a0:	shr    $0x8,%rax
   e45a4:	lea    (%rax,%rdx,2),%rax
   e45a8:	mov    %rax,%rdx
   e45ab:	movabs $0xff000000ff,%rsi
   e45b5:	and    %rsi,%rdx
   e45b8:	movabs $0xf424000000064,%rdi
   e45c2:	imul   %rdi,%rdx
   e45c6:	shr    $0x10,%rax
   e45ca:	and    %rsi,%rax
   e45cd:	movabs $0x271000000001,%r8
   e45d7:	imul   %r8,%rax
   e45db:	add    %rdx,%rax
   e45de:	shr    $0x20,%rax
   e45e2:	lea    (%rcx,%rcx,4),%rdx
   e45e6:	shr    $0x8,%rcx
   e45ea:	lea    (%rcx,%rdx,2),%rcx
   e45ee:	mov    %rcx,%rdx
   e45f1:	and    %rsi,%rdx
   e45f4:	imul   %rdi,%rdx
   e45f8:	shr    $0x10,%rcx
   e45fc:	and    %rsi,%rcx
   e45ff:	imul   %r8,%rcx
   e4603:	add    %rdx,%rcx
   e4606:	shr    $0x20,%rcx
   e460a:	imul   $0x5f5e100,%rax,%r14
   e4611:	add    %rcx,%r14
   e4614:	jmp    e41c6 <sessions::fast::parse_events_avx2+0x5826>
   e4619:	mov    $0xffffffff,%eax
   e461e:	mov    %rax,0x28(%rsp)
   e4623:	mov    %r14,%r10
   e4626:	mov    0x70(%rsp),%r11
   e462b:	jmp    e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e4630:	mov    $0x8,%ecx
   e4635:	xor    %eax,%eax
   e4637:	xor    0x0(%r13,%rax,1),%rdx
   e463c:	mulx   %r8,%rax,%rdx
   e4641:	xor    %rax,%rdx
   e4644:	mov    %rcx,%rax
   e4647:	cmp    %rbp,%rax
   e464a:	je     e4667 <sessions::fast::parse_events_avx2+0x5cc7>
   e464c:	mov    %ebp,%ecx
   e464e:	neg    %ecx
   e4650:	shl    $0x3,%ecx
   e4653:	and    $0x38,%cl
   e4656:	mov    $0x40,%esi
   e465b:	sub    %ecx,%esi
   e465d:	bzhi   %rsi,0x0(%r13,%rax,1),%rax
   e4664:	xor    %rax,%rdx
   e4667:	movabs $0xa0761d6478bd642f,%rax
   e4671:	mulx   %rax,%rax,%r10
   e4676:	xor    %rax,%r10
   e4679:	shl    $0x30,%rbp
   e467d:	or     %r13,%rbp
   e4680:	movabs $0xff00000000000000,%rax
   e468a:	or     %rax,%rbp
   e468d:	mov    %rbp,%r11
   e4690:	mov    %r10,%rcx
   e4693:	mov    0x60(%rsp),%r13
   e4698:	and    $0x1,%r15d
   e469c:	mov    0x10(%rsp),%rax
   e46a1:	lea    (%r15,%rax,1),%ebx
   e46a5:	inc    %ebx
   e46a7:	lea    (%rax,%r15,2),%edx
   e46ab:	inc    %edx
   e46ad:	mov    %r14d,%eax
   e46b0:	sub    %edx,%eax
   e46b2:	add    0x48(%rsp),%rbx
   e46b7:	movzbl 0x9a8(%r9),%esi
   e46bf:	xor    %r8d,%r8d
   e46c2:	sub    %sil,%r8b
   e46c5:	shrx   %r8,%rcx,%rcx
   e46ca:	cmp    $0x19,%rax
   e46ce:	mov    %rcx,0x88(%rsp)
   e46d6:	je     e484b <sessions::fast::parse_events_avx2+0x5eab>
   e46dc:	cmp    $0x14,%eax
   e46df:	jne    e4a6a <sessions::fast::parse_events_avx2+0x60ca>
   e46e5:	cmpb   $0x5a,0x13(%rbx)
   e46e9:	jne    e4b3e <sessions::fast::parse_events_avx2+0x619e>
   e46ef:	mov    (%rbx),%rdx
   e46f2:	mov    0x20(%rsp),%rsi
   e46f7:	mov    0x930(%rsi),%rcx
   e46fe:	imul   %rdx,%rcx
   e4702:	shr    $0x3c,%rcx
   e4706:	cmp    %rdx,0x6e8(%rsi,%rcx,8)
   e470e:	jne    e677c <sessions::fast::parse_events_avx2+0x7ddc>
   e4714:	mov    %r11,%r12
   e4717:	mov    %r10,%r15
   e471a:	mov    0x768(%rsi,%rcx,8),%rax
   e4722:	mov    0x7e8(%rsi,%rcx,8),%rcx
   e472a:	movabs $0x7676767676767676,%r9
   e4734:	movzwl 0x8(%rbx),%edx
   e4738:	xor    $0x3030,%rdx
   e473f:	mov    0xb(%rbx),%rdi
   e4743:	mov    %rdi,%rsi
   e4746:	movabs $0x3030303030303030,%r8
   e4750:	xor    %r8,%rsi
   e4753:	lea    0x7676(%rdx),%r8d
   e475a:	or     %edx,%r8d
   e475d:	and    $0x8080,%r8d
   e4764:	add    %rsi,%r9
   e4767:	or     %rdi,%r9
   e476a:	movabs $0x8080008080008080,%r10
   e4774:	and    %r10,%r9
   e4777:	xor    %r10d,%r10d
   e477a:	cmpb   $0x54,0xa(%rbx)
   e477e:	setne  %r10b
   e4782:	movabs $0xff0000ff0000,%r11
   e478c:	and    %r11,%rdi
   e478f:	or     %r10,%rdi
   e4792:	or     %r9,%rdi
   e4795:	or     %r8,%rdi
   e4798:	movabs $0x3a00003a0000,%r8
   e47a2:	cmp    %r8,%rdi
   e47a5:	jne    e4ee5 <sessions::fast::parse_events_avx2+0x6545>
   e47ab:	mov    $0xffffffff,%edi
   e47b0:	mov    %rdi,0x28(%rsp)
   e47b5:	lea    (%rsi,%rsi,4),%rdi
   e47b9:	shr    $0x8,%rsi
   e47bd:	lea    (%rsi,%rdi,2),%r8
   e47c1:	mov    %r8,%rsi
   e47c4:	shr    $0x30,%rsi
   e47c8:	movzbl %sil,%esi
   e47cc:	cmp    $0x3b,%rsi
   e47d0:	mov    %r15,%r10
   e47d3:	mov    %r12,%r11
   e47d6:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e47dc:	mov    %r8d,%edi
   e47df:	shr    $0x18,%edi
   e47e2:	cmp    $0x3b,%edi
   e47e5:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e47eb:	movzbl %r8b,%r8d
   e47ef:	cmp    $0x17,%r8d
   e47f3:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e47f9:	movzbl %dl,%r9d
   e47fd:	lea    (%r9,%r9,4),%r9
   e4801:	shr    $0x8,%edx
   e4804:	lea    (%rdx,%r9,2),%rdx
   e4808:	test   %rdx,%rdx
   e480b:	je     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4811:	cmp    %rcx,%rdx
   e4814:	jg     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e481a:	add    %rax,%rdx
   e481d:	imul   $0x15180,%rdx,%rax
   e4824:	imul   $0xe10,%r8,%rcx
   e482b:	imul   $0x3c,%rdi,%rdx
   e482f:	add    %rsi,%rcx
   e4832:	add    %rdx,%rcx
   e4835:	add    %rax,%rcx
   e4838:	imul   $0x3e8,%rcx,%r12
   e483f:	add    $0xfffffffffad9a400,%r12
   e4846:	jmp    e4bac <sessions::fast::parse_events_avx2+0x620c>
   e484b:	movzbl 0x13(%rbx),%ebp
   e484f:	cmp    $0x2b,%ebp
   e4852:	je     e485d <sessions::fast::parse_events_avx2+0x5ebd>
   e4854:	cmp    $0x2d,%ebp
   e4857:	jne    e4b3e <sessions::fast::parse_events_avx2+0x619e>
   e485d:	mov    (%rbx),%rdx
   e4860:	mov    0x20(%rsp),%rsi
   e4865:	mov    0x930(%rsi),%rcx
   e486c:	imul   %rdx,%rcx
   e4870:	shr    $0x3c,%rcx
   e4874:	cmp    %rdx,0x6e8(%rsi,%rcx,8)
   e487c:	jne    e6656 <sessions::fast::parse_events_avx2+0x7cb6>
   e4882:	mov    %r11,%r12
   e4885:	mov    %r10,%r15
   e4888:	mov    0x768(%rsi,%rcx,8),%rax
   e4890:	mov    0x7e8(%rsi,%rcx,8),%rdx
   e4898:	movabs $0x7676767676767676,%r9
   e48a2:	movzwl 0x8(%rbx),%r8d
   e48a7:	xor    $0x3030,%r8
   e48ae:	mov    0xb(%rbx),%rsi
   e48b2:	mov    %rsi,%rcx
   e48b5:	movabs $0x3030303030303030,%rdi
   e48bf:	xor    %rdi,%rcx
   e48c2:	lea    0x7676(%r8),%edi
   e48c9:	or     %r8d,%edi
   e48cc:	and    $0x8080,%edi
   e48d2:	add    %rcx,%r9
   e48d5:	or     %rsi,%r9
   e48d8:	movabs $0x8080008080008080,%r10
   e48e2:	and    %r10,%r9
   e48e5:	xor    %r10d,%r10d
   e48e8:	cmpb   $0x54,0xa(%rbx)
   e48ec:	setne  %r10b
   e48f0:	movabs $0xff0000ff0000,%r11
   e48fa:	and    %r11,%rsi
   e48fd:	or     %r10,%rsi
   e4900:	or     %r9,%rsi
   e4903:	or     %rdi,%rsi
   e4906:	mov    $0xffffffff,%edi
   e490b:	mov    %rdi,0x28(%rsp)
   e4910:	movabs $0x3a00003a0000,%rdi
   e491a:	cmp    %rdi,%rsi
   e491d:	jne    e4eef <sessions::fast::parse_events_avx2+0x654f>
   e4923:	lea    (%rcx,%rcx,4),%rsi
   e4927:	shr    $0x8,%rcx
   e492b:	lea    (%rcx,%rsi,2),%rdi
   e492f:	mov    %rdi,%rcx
   e4932:	shr    $0x30,%rcx
   e4936:	movzbl %cl,%ecx
   e4939:	cmp    $0x3b,%rcx
   e493d:	mov    %r15,%r10
   e4940:	mov    %r12,%r11
   e4943:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4949:	mov    %edi,%esi
   e494b:	shr    $0x18,%esi
   e494e:	cmp    $0x3b,%esi
   e4951:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4957:	movzbl %dil,%edi
   e495b:	cmp    $0x17,%edi
   e495e:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4964:	movzbl %r8b,%r9d
   e4968:	lea    (%r9,%r9,4),%r9
   e496c:	shr    $0x8,%r8d
   e4970:	lea    (%r8,%r9,2),%r8
   e4974:	test   %r8,%r8
   e4977:	je     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e497d:	cmp    %rdx,%r8
   e4980:	jg     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4986:	cmpb   $0x3a,0x16(%rbx)
   e498a:	jne    e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4990:	movzbl 0x14(%rbx),%edx
   e4994:	add    $0xd0,%dl
   e4997:	cmp    $0x9,%dl
   e499a:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e49a0:	movzbl 0x15(%rbx),%r9d
   e49a5:	add    $0xd0,%r9b
   e49a9:	cmp    $0x9,%r9b
   e49ad:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e49b3:	mov    %r11,%r12
   e49b6:	movzbl 0x17(%rbx),%r11d
   e49bb:	add    $0xd0,%r11b
   e49bf:	cmp    $0x9,%r11b
   e49c3:	ja     e4ef2 <sessions::fast::parse_events_avx2+0x6552>
   e49c9:	mov    %r10,%r15
   e49cc:	movzbl 0x18(%rbx),%r10d
   e49d1:	add    $0xd0,%r10b
   e49d5:	cmp    $0x9,%r10b
   e49d9:	ja     e4eef <sessions::fast::parse_events_avx2+0x654f>
   e49df:	movzbl %dl,%edx
   e49e2:	add    %edx,%edx
   e49e4:	lea    (%rdx,%rdx,4),%edx
   e49e7:	add    %r9b,%dl
   e49ea:	cmp    $0x17,%dl
   e49ed:	ja     e4eef <sessions::fast::parse_events_avx2+0x654f>
   e49f3:	movzbl %r11b,%r9d
   e49f7:	add    %r9d,%r9d
   e49fa:	lea    (%r9,%r9,4),%r9d
   e49fe:	add    %r10b,%r9b
   e4a01:	cmp    $0x3b,%r9b
   e4a05:	mov    %r15,%r10
   e4a08:	mov    %r12,%r11
   e4a0b:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4a11:	add    %rax,%r8
   e4a14:	imul   $0x15180,%r8,%rax
   e4a1b:	imul   $0xe10,%rdi,%rdi
   e4a22:	imul   $0x3c,%rsi,%rsi
   e4a26:	add    %rcx,%rdi
   e4a29:	add    %rsi,%rdi
   e4a2c:	add    %rax,%rdi
   e4a2f:	imul   $0x3e8,%rdi,%rax
   e4a36:	add    $0xfffffffffad9a400,%rax
   e4a3c:	movzbl %r9b,%ecx
   e4a40:	movzbl %dl,%edx
   e4a43:	imul   $0x36ee80,%rdx,%rdx
   e4a4a:	imul   $0xea60,%rcx,%rcx
   e4a51:	add    %rdx,%rcx
   e4a54:	mov    %rcx,%r12
   e4a57:	neg    %r12
   e4a5a:	cmp    $0x2b,%bpl
   e4a5e:	cmovne %rcx,%r12
   e4a62:	add    %rax,%r12
   e4a65:	jmp    e4bac <sessions::fast::parse_events_avx2+0x620c>
   e4a6a:	lea    -0x1(%rax),%ecx
   e4a6d:	cmp    $0x10,%ecx
   e4a70:	jae    e4b2b <sessions::fast::parse_events_avx2+0x618b>
   e4a76:	cmp    $0x9,%eax
   e4a79:	movabs $0x8080808080808080,%rdi
   e4a83:	movabs $0x7676767676767676,%r8
   e4a8d:	movabs $0x3030303030303030,%r9
   e4a97:	jae    e4e04 <sessions::fast::parse_events_avx2+0x6464>
   e4a9d:	lea    0x0(,%rax,8),%ecx
   e4aa4:	cmp    $0x8,%rax
   e4aa8:	shrx   %rcx,%r9,%rdx
   e4aad:	mov    $0x0,%ecx
   e4ab2:	cmovne %rdx,%rcx
   e4ab6:	neg    %al
   e4ab8:	shl    $0x3,%al
   e4abb:	shlx   %rax,(%rbx),%rax
   e4ac0:	or     %rax,%rcx
   e4ac3:	xor    %r9,%rcx
   e4ac6:	lea    (%rcx,%r8,1),%rdx
   e4aca:	or     %rax,%rdx
   e4acd:	mov    $0xffffffff,%eax
   e4ad2:	mov    %rax,0x28(%rsp)
   e4ad7:	test   %rdi,%rdx
   e4ada:	jne    e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4ae0:	lea    (%rcx,%rcx,4),%rax
   e4ae4:	shr    $0x8,%rcx
   e4ae8:	lea    (%rcx,%rax,2),%r12
   e4aec:	mov    %r12,%rax
   e4aef:	movabs $0xff000000ff,%rcx
   e4af9:	and    %rcx,%rax
   e4afc:	movabs $0xf424000000064,%rdx
   e4b06:	imul   %rdx,%rax
   e4b0a:	shr    $0x10,%r12
   e4b0e:	and    %rcx,%r12
   e4b11:	movabs $0x271000000001,%rcx
   e4b1b:	imul   %rcx,%r12
   e4b1f:	add    %rax,%r12
   e4b22:	shr    $0x20,%r12
   e4b26:	jmp    e4bac <sessions::fast::parse_events_avx2+0x620c>
   e4b2b:	mov    $0xffffffff,%ecx
   e4b30:	mov    %rcx,0x28(%rsp)
   e4b35:	cmp    %edx,%r14d
   e4b38:	je     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4b3e:	xor    %ecx,%ecx
   e4b40:	xor    %esi,%esi
   e4b42:	xor    %edx,%edx
   e4b44:	xor    %r12d,%r12d
   e4b47:	nopw   0x0(%rax,%rax,1)
   e4b50:	movzbl (%rbx,%rsi,1),%edi
   e4b54:	add    $0xd0,%dil
   e4b58:	cmp    $0x9,%dil
   e4b5c:	ja     e4df5 <sessions::fast::parse_events_avx2+0x6455>
   e4b62:	test   %dil,%dil
   e4b65:	setne  %r8b
   e4b69:	or     %r8b,%cl
   e4b6c:	movzbl %cl,%r8d
   e4b70:	and    $0x1,%r8d
   e4b74:	add    %r8d,%edx
   e4b77:	lea    (%r12,%r12,4),%r8
   e4b7b:	movzbl %dil,%edi
   e4b7f:	lea    (%rdi,%r8,2),%r12
   e4b83:	inc    %rsi
   e4b86:	cmp    %rsi,%rax
   e4b89:	jne    e4b50 <sessions::fast::parse_events_avx2+0x61b0>
   e4b8b:	mov    $0xffffffff,%eax
   e4b90:	mov    %rax,0x28(%rsp)
   e4b95:	cmp    $0x14,%edx
   e4b98:	setb   %al
   e4b9b:	test   %r12,%r12
   e4b9e:	setns  %cl
   e4ba1:	and    %al,%cl
   e4ba3:	cmp    $0x1,%cl
   e4ba6:	jne    e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4bac:	mov    %r12,%rax
   e4baf:	mov    0x20(%rsp),%r9
   e4bb4:	sub    0x950(%r9),%rax
   e4bbb:	mov    %rax,%rdx
   e4bbe:	shr    $0x3,%rdx
   e4bc2:	movabs $0x20c49ba5e353f7cf,%rcx
   e4bcc:	mulx   %rcx,%rsi,%rsi
   e4bd1:	movabs $0x3e7fffffc18,%rcx
   e4bdb:	cmp    %rcx,%rax
   e4bde:	jae    e4bf0 <sessions::fast::parse_events_avx2+0x6250>
   e4be0:	shr    $0x4,%rsi
   e4be4:	imul   $0x3e8,%rsi,%rcx
   e4beb:	cmp    %rcx,%rax
   e4bee:	je     e4bfd <sessions::fast::parse_events_avx2+0x625d>
   e4bf0:	movb   $0x1,0x530(%rsp)
   e4bf8:	mov    $0xffffffff,%esi
   e4bfd:	mov    0x18(%rsp),%rcx
   e4c02:	mov    0x38(%rsp),%rdx
   e4c07:	mov    0x8(%rsp),%rdi
   e4c0c:	mov    0x80(%rsp),%r8
   e4c14:	and    $0x1,%edx
   e4c17:	lea    (%rcx,%rdx,2),%eax
   e4c1a:	inc    %eax
   e4c1c:	mov    %r8d,%r15d
   e4c1f:	sub    %eax,%r15d
   e4c22:	mov    %rsi,0x28(%rsp)
   e4c27:	je     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4c2d:	and    $0x1,%edi
   e4c30:	mov    0x40(%rsp),%rax
   e4c35:	lea    (%rax,%rdi,2),%ebp
   e4c38:	inc    %ebp
   e4c3a:	cmp    %ebp,0x70(%rsp)
   e4c3e:	je     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4c44:	mov    %rdx,0x38(%rsp)
   e4c49:	mov    0x68(%rsp),%rax
   e4c4e:	and    $0x1,%eax
   e4c51:	lea    (%rax,%r8,1),%ebx
   e4c55:	inc    %ebx
   e4c57:	lea    (%r8,%rax,2),%ecx
   e4c5b:	inc    %ecx
   e4c5d:	mov    0x10(%rsp),%rax
   e4c62:	sub    %ecx,%eax
   e4c64:	add    0x48(%rsp),%rbx
   e4c69:	cmp    $0x19,%rax
   e4c6d:	mov    %rdi,0x8(%rsp)
   e4c72:	je     e504f <sessions::fast::parse_events_avx2+0x66af>
   e4c78:	cmp    $0x14,%eax
   e4c7b:	jne    e5270 <sessions::fast::parse_events_avx2+0x68d0>
   e4c81:	cmpb   $0x5a,0x13(%rbx)
   e4c85:	jne    e560f <sessions::fast::parse_events_avx2+0x6c6f>
   e4c8b:	mov    %ebp,0x80(%rsp)
   e4c92:	mov    %r15,0x10(%rsp)
   e4c97:	mov    (%rbx),%rdx
   e4c9a:	mov    0x930(%r9),%rcx
   e4ca1:	imul   %rdx,%rcx
   e4ca5:	shr    $0x3c,%rcx
   e4ca9:	cmp    %rdx,0x6e8(%r9,%rcx,8)
   e4cb1:	jne    e7034 <sessions::fast::parse_events_avx2+0x8694>
   e4cb7:	mov    %r11,%rbp
   e4cba:	mov    %r10,%r15
   e4cbd:	mov    0x768(%r9,%rcx,8),%rax
   e4cc5:	mov    0x7e8(%r9,%rcx,8),%rcx
   e4ccd:	movabs $0x7676767676767676,%r9
   e4cd7:	movzwl 0x8(%rbx),%edx
   e4cdb:	xor    $0x3030,%rdx
   e4ce2:	mov    0xb(%rbx),%rdi
   e4ce6:	mov    %rdi,%rsi
   e4ce9:	movabs $0x3030303030303030,%r8
   e4cf3:	xor    %r8,%rsi
   e4cf6:	lea    0x7676(%rdx),%r8d
   e4cfd:	or     %edx,%r8d
   e4d00:	and    $0x8080,%r8d
   e4d07:	add    %rsi,%r9
   e4d0a:	or     %rdi,%r9
   e4d0d:	movabs $0x8080008080008080,%r10
   e4d17:	and    %r10,%r9
   e4d1a:	xor    %r10d,%r10d
   e4d1d:	cmpb   $0x54,0xa(%rbx)
   e4d21:	setne  %r10b
   e4d25:	movabs $0xff0000ff0000,%r11
   e4d2f:	and    %r11,%rdi
   e4d32:	or     %r10,%rdi
   e4d35:	or     %r9,%rdi
   e4d38:	or     %r8,%rdi
   e4d3b:	movabs $0x3a00003a0000,%r8
   e4d45:	cmp    %r8,%rdi
   e4d48:	jne    e70ba <sessions::fast::parse_events_avx2+0x871a>
   e4d4e:	lea    (%rsi,%rsi,4),%rdi
   e4d52:	shr    $0x8,%rsi
   e4d56:	lea    (%rsi,%rdi,2),%r8
   e4d5a:	mov    %r8,%rsi
   e4d5d:	shr    $0x30,%rsi
   e4d61:	movzbl %sil,%esi
   e4d65:	cmp    $0x3b,%rsi
   e4d69:	mov    %r15,%r10
   e4d6c:	mov    %rbp,%r11
   e4d6f:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4d75:	mov    %r8d,%edi
   e4d78:	shr    $0x18,%edi
   e4d7b:	cmp    $0x3b,%edi
   e4d7e:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4d84:	movzbl %r8b,%r8d
   e4d88:	cmp    $0x17,%r8d
   e4d8c:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4d92:	movzbl %dl,%r9d
   e4d96:	lea    (%r9,%r9,4),%r9
   e4d9a:	shr    $0x8,%edx
   e4d9d:	lea    (%rdx,%r9,2),%rdx
   e4da1:	test   %rdx,%rdx
   e4da4:	je     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4daa:	cmp    %rcx,%rdx
   e4dad:	jg     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4db3:	add    %rax,%rdx
   e4db6:	imul   $0x15180,%rdx,%rax
   e4dbd:	imul   $0xe10,%r8,%rcx
   e4dc4:	imul   $0x3c,%rdi,%rdx
   e4dc8:	add    %rsi,%rcx
   e4dcb:	add    %rdx,%rcx
   e4dce:	add    %rax,%rcx
   e4dd1:	imul   $0x3e8,%rcx,%r13
   e4dd8:	add    $0xfffffffffad9a400,%r13
   e4ddf:	mov    0x20(%rsp),%r9
   e4de4:	mov    0x10(%rsp),%r15
   e4de9:	mov    0x80(%rsp),%ebp
   e4df0:	jmp    e57c5 <sessions::fast::parse_events_avx2+0x6e25>
   e4df5:	mov    $0xffffffff,%eax
   e4dfa:	mov    %rax,0x28(%rsp)
   e4dff:	jmp    e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4e04:	mov    %eax,%ecx
   e4e06:	add    $0xfffffffffffffff8,%rax
   e4e0a:	lea    0x0(,%rax,8),%edx
   e4e11:	cmp    $0x10,%ecx
   e4e14:	shrx   %rdx,%r9,%rcx
   e4e19:	mov    $0x0,%edx
   e4e1e:	cmovae %rdx,%rcx
   e4e22:	mov    %eax,%edx
   e4e24:	neg    %dl
   e4e26:	shl    $0x3,%dl
   e4e29:	shlx   %rdx,(%rbx),%rdx
   e4e2e:	or     %rdx,%rcx
   e4e31:	xor    %r9,%rcx
   e4e34:	lea    (%rcx,%r8,1),%rsi
   e4e38:	or     %rdx,%rsi
   e4e3b:	mov    $0xffffffff,%edx
   e4e40:	mov    %rdx,0x28(%rsp)
   e4e45:	test   %rdi,%rsi
   e4e48:	jne    e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4e4e:	mov    (%rbx,%rax,1),%rax
   e4e52:	mov    %rax,%rdx
   e4e55:	xor    %r9,%rdx
   e4e58:	lea    (%rdx,%r8,1),%rsi
   e4e5c:	or     %rax,%rsi
   e4e5f:	test   %rdi,%rsi
   e4e62:	jne    e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e4e68:	lea    (%rcx,%rcx,4),%rax
   e4e6c:	shr    $0x8,%rcx
   e4e70:	lea    (%rcx,%rax,2),%rax
   e4e74:	mov    %rax,%rcx
   e4e77:	movabs $0xff000000ff,%rsi
   e4e81:	and    %rsi,%rcx
   e4e84:	movabs $0xf424000000064,%rdi
   e4e8e:	imul   %rdi,%rcx
   e4e92:	shr    $0x10,%rax
   e4e96:	and    %rsi,%rax
   e4e99:	movabs $0x271000000001,%r8
   e4ea3:	imul   %r8,%rax
   e4ea7:	add    %rcx,%rax
   e4eaa:	shr    $0x20,%rax
   e4eae:	lea    (%rdx,%rdx,4),%rcx
   e4eb2:	shr    $0x8,%rdx
   e4eb6:	lea    (%rdx,%rcx,2),%rcx
   e4eba:	mov    %rcx,%rdx
   e4ebd:	and    %rsi,%rdx
   e4ec0:	imul   %rdi,%rdx
   e4ec4:	shr    $0x10,%rcx
   e4ec8:	and    %rsi,%rcx
   e4ecb:	imul   %r8,%rcx
   e4ecf:	add    %rdx,%rcx
   e4ed2:	shr    $0x20,%rcx
   e4ed6:	imul   $0x5f5e100,%rax,%r12
   e4edd:	add    %rcx,%r12
   e4ee0:	jmp    e4bac <sessions::fast::parse_events_avx2+0x620c>
   e4ee5:	mov    $0xffffffff,%eax
   e4eea:	mov    %rax,0x28(%rsp)
   e4eef:	mov    %r15,%r10
   e4ef2:	mov    %r12,%r11
   e4ef5:	mov    0xf0(%rsp),%rsi
   e4efd:	mov    0x108(%rsp),%r15
   e4f05:	mov    0x68(%r15),%rax
   e4f09:	mov    0x88(%rsp),%r14
   e4f11:	movzbl (%rax,%r14,1),%edx
   e4f16:	mov    %r14,%rbx
   e4f19:	shl    $0x6,%rbx
   e4f1d:	add    0x50(%r15),%rbx
   e4f21:	lea    0x1(%rdx),%rcx
   e4f25:	shl    $0x5,%edx
   e4f28:	mov    %r10,(%rdx,%rbx,1)
   e4f2c:	mov    %r11,0x8(%rdx,%rbx,1)
   e4f31:	movabs $0xffffffff00000000,%rdi
   e4f3b:	mov    %rdi,0x10(%rdx,%rbx,1)
   e4f40:	movl   $0x0,0x18(%rdx,%rbx,1)
   e4f48:	mov    0x28(%rsp),%rdi
   e4f4d:	mov    %edi,0x1c(%rdx,%rbx,1)
   e4f51:	cmp    $0x2,%rcx
   e4f55:	jne    e4fa8 <sessions::fast::parse_events_avx2+0x6608>
   e4f57:	movb   $0x0,(%rax,%r14,1)
   e4f5c:	mov    0x8(%r15),%rax
   e4f60:	mov    0x20(%r15),%rdx
   e4f64:	mov    (%rax,%r14,8),%rcx
   e4f68:	cmp    (%rdx,%r14,8),%rcx
   e4f6c:	je     e5f81 <sessions::fast::parse_events_avx2+0x75e1>
   e4f72:	vmovaps (%rbx),%xmm0
   e4f76:	movntdq %xmm0,(%rcx)
   e4f7a:	lea    0x10(%rcx),%rdx
   e4f7e:	vmovaps 0x10(%rbx),%xmm0
   e4f83:	movntdq %xmm0,(%rdx)
   e4f87:	lea    0x20(%rcx),%rdx
   e4f8b:	vmovaps 0x20(%rbx),%xmm0
   e4f90:	movntdq %xmm0,(%rdx)
   e4f94:	add    $0x30,%rcx
   e4f98:	vmovdqa 0x30(%rbx),%xmm0
   e4f9d:	movntdq %xmm0,(%rcx)
   e4fa1:	addq   $0x40,(%rax,%r14,8)
   e4fa6:	jmp    e4fb0 <sessions::fast::parse_events_avx2+0x6610>
   e4fa8:	mov    %cl,(%rax,%r14,1)
   e4fac:	nopl   0x0(%rax)
   e4fb0:	mov    0x98(%rsp),%rax
   e4fb8:	add    %r13,%rax
   e4fbb:	inc    %rax
   e4fbe:	mov    0xa8(%rsp),%r12
   e4fc6:	cmp    %r12,%rax
   e4fc9:	jb     e3180 <sessions::fast::parse_events_avx2+0x47e0>
   e4fcf:	jmp    e307d <sessions::fast::parse_events_avx2+0x46dd>
   e4fd4:	mov    $0x8,%ecx
   e4fd9:	xor    %eax,%eax
   e4fdb:	mov    0x28(%rsp),%r15
   e4fe0:	mov    %rbx,%r12
   e4fe3:	xor    0x0(%r13,%rax,1),%rdx
   e4fe8:	mulx   %r8,%rax,%rdx
   e4fed:	xor    %rax,%rdx
   e4ff0:	mov    %rcx,%rax
   e4ff3:	cmp    %r14,%rax
   e4ff6:	je     e5014 <sessions::fast::parse_events_avx2+0x6674>
   e4ff8:	mov    %r14d,%ecx
   e4ffb:	neg    %ecx
   e4ffd:	shl    $0x3,%ecx
   e5000:	and    $0x38,%cl
   e5003:	mov    $0x40,%esi
   e5008:	sub    %ecx,%esi
   e500a:	bzhi   %rsi,0x0(%r13,%rax,1),%rax
   e5011:	xor    %rax,%rdx
   e5014:	mov    0x10(%rsp),%rsi
   e5019:	mov    0x8(%rsp),%r8
   e501e:	movabs $0xa0761d6478bd642f,%rax
   e5028:	mulx   %rax,%rax,%r10
   e502d:	xor    %rax,%r10
   e5030:	shl    $0x30,%r14
   e5034:	or     %r13,%r14
   e5037:	movabs $0xff00000000000000,%rax
   e5041:	or     %rax,%r14
   e5044:	mov    %r14,%r11
   e5047:	mov    %r10,%rax
   e504a:	jmp    e3c9c <sessions::fast::parse_events_avx2+0x52fc>
   e504f:	movzbl 0x13(%rbx),%esi
   e5053:	cmp    $0x2b,%esi
   e5056:	je     e5061 <sessions::fast::parse_events_avx2+0x66c1>
   e5058:	cmp    $0x2d,%esi
   e505b:	jne    e560f <sessions::fast::parse_events_avx2+0x6c6f>
   e5061:	mov    %ebp,0x80(%rsp)
   e5068:	mov    %r15,0x10(%rsp)
   e506d:	mov    (%rbx),%rdx
   e5070:	mov    0x930(%r9),%rcx
   e5077:	imul   %rdx,%rcx
   e507b:	shr    $0x3c,%rcx
   e507f:	cmp    %rdx,0x6e8(%r9,%rcx,8)
   e5087:	mov    %esi,0x68(%rsp)
   e508b:	mov    %r11,%rbp
   e508e:	mov    %r10,%r15
   e5091:	jne    e6f71 <sessions::fast::parse_events_avx2+0x85d1>
   e5097:	mov    0x768(%r9,%rcx,8),%rax
   e509f:	mov    0x7e8(%r9,%rcx,8),%rdx
   e50a7:	movabs $0x7676767676767676,%r9
   e50b1:	movzwl 0x8(%rbx),%r8d
   e50b6:	xor    $0x3030,%r8
   e50bd:	mov    0xb(%rbx),%rsi
   e50c1:	mov    %rsi,%rcx
   e50c4:	movabs $0x3030303030303030,%rdi
   e50ce:	xor    %rdi,%rcx
   e50d1:	lea    0x7676(%r8),%edi
   e50d8:	or     %r8d,%edi
   e50db:	and    $0x8080,%edi
   e50e1:	add    %rcx,%r9
   e50e4:	or     %rsi,%r9
   e50e7:	movabs $0x8080008080008080,%r10
   e50f1:	and    %r10,%r9
   e50f4:	xor    %r10d,%r10d
   e50f7:	cmpb   $0x54,0xa(%rbx)
   e50fb:	setne  %r10b
   e50ff:	movabs $0xff0000ff0000,%r11
   e5109:	and    %r11,%rsi
   e510c:	or     %r10,%rsi
   e510f:	or     %r9,%rsi
   e5112:	or     %rdi,%rsi
   e5115:	movabs $0x3a00003a0000,%rdi
   e511f:	cmp    %rdi,%rsi
   e5122:	jne    e70ba <sessions::fast::parse_events_avx2+0x871a>
   e5128:	lea    (%rcx,%rcx,4),%rsi
   e512c:	shr    $0x8,%rcx
   e5130:	lea    (%rcx,%rsi,2),%rdi
   e5134:	mov    %rdi,%rcx
   e5137:	shr    $0x30,%rcx
   e513b:	movzbl %cl,%ecx
   e513e:	cmp    $0x3b,%rcx
   e5142:	mov    %r15,%r10
   e5145:	mov    %rbp,%r11
   e5148:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e514e:	mov    %edi,%esi
   e5150:	shr    $0x18,%esi
   e5153:	cmp    $0x3b,%esi
   e5156:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e515c:	movzbl %dil,%edi
   e5160:	cmp    $0x17,%edi
   e5163:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e5169:	movzbl %r8b,%r9d
   e516d:	lea    (%r9,%r9,4),%r9
   e5171:	shr    $0x8,%r8d
   e5175:	lea    (%r8,%r9,2),%r8
   e5179:	test   %r8,%r8
   e517c:	je     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e5182:	cmp    %rdx,%r8
   e5185:	jg     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e518b:	cmpb   $0x3a,0x16(%rbx)
   e518f:	jne    e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e5195:	movzbl 0x14(%rbx),%edx
   e5199:	add    $0xd0,%dl
   e519c:	cmp    $0x9,%dl
   e519f:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e51a5:	movzbl 0x15(%rbx),%r9d
   e51aa:	add    $0xd0,%r9b
   e51ae:	cmp    $0x9,%r9b
   e51b2:	ja     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e51b8:	mov    %r11,%rbp
   e51bb:	movzbl 0x17(%rbx),%r11d
   e51c0:	add    $0xd0,%r11b
   e51c4:	cmp    $0x9,%r11b
   e51c8:	ja     e5ea2 <sessions::fast::parse_events_avx2+0x7502>
   e51ce:	mov    %r10,%r15
   e51d1:	movzbl 0x18(%rbx),%r10d
   e51d6:	add    $0xd0,%r10b
   e51da:	cmp    $0x9,%r10b
   e51de:	ja     e70ba <sessions::fast::parse_events_avx2+0x871a>
   e51e4:	movzbl %dl,%edx
   e51e7:	add    %edx,%edx
   e51e9:	lea    (%rdx,%rdx,4),%edx
   e51ec:	add    %r9b,%dl
   e51ef:	cmp    $0x17,%dl
   e51f2:	ja     e70ba <sessions::fast::parse_events_avx2+0x871a>
   e51f8:	movzbl %r11b,%r9d
   e51fc:	add    %r9d,%r9d
   e51ff:	lea    (%r9,%r9,4),%r9d
   e5203:	add    %r10b,%r9b
   e5206:	cmp    $0x3b,%r9b
   e520a:	ja     e70ba <sessions::fast::parse_events_avx2+0x871a>
   e5210:	add    %rax,%r8
   e5213:	imul   $0x15180,%r8,%rax
   e521a:	imul   $0xe10,%rdi,%rdi
   e5221:	imul   $0x3c,%rsi,%rsi
   e5225:	add    %rcx,%rdi
   e5228:	add    %rsi,%rdi
   e522b:	add    %rax,%rdi
   e522e:	imul   $0x3e8,%rdi,%rax
   e5235:	add    $0xfffffffffad9a400,%rax
   e523b:	movzbl %r9b,%ecx
   e523f:	movzbl %dl,%edx
   e5242:	imul   $0x36ee80,%rdx,%rdx
   e5249:	imul   $0xea60,%rcx,%rcx
   e5250:	add    %rdx,%rcx
   e5253:	mov    %rcx,%r13
   e5256:	neg    %r13
   e5259:	cmpb   $0x2b,0x68(%rsp)
   e525e:	cmovne %rcx,%r13
   e5262:	add    %rax,%r13
   e5265:	mov    %r15,%r10
   e5268:	mov    %rbp,%r11
   e526b:	jmp    e4ddf <sessions::fast::parse_events_avx2+0x643f>
   e5270:	lea    -0x1(%rax),%edx
   e5273:	cmp    $0x10,%edx
   e5276:	jae    e5605 <sessions::fast::parse_events_avx2+0x6c65>
   e527c:	cmp    $0x9,%eax
   e527f:	movabs $0x8080808080808080,%rdi
   e5289:	movabs $0x7676767676767676,%r8
   e5293:	movabs $0x3030303030303030,%r9
   e529d:	jae    e56ee <sessions::fast::parse_events_avx2+0x6d4e>
   e52a3:	lea    0x0(,%rax,8),%ecx
   e52aa:	cmp    $0x8,%rax
   e52ae:	shrx   %rcx,%r9,%rdx
   e52b3:	mov    $0x0,%ecx
   e52b8:	cmovne %rdx,%rcx
   e52bc:	neg    %al
   e52be:	shl    $0x3,%al
   e52c1:	shlx   %rax,(%rbx),%rax
   e52c6:	or     %rax,%rcx
   e52c9:	xor    %r9,%rcx
   e52cc:	lea    (%rcx,%r8,1),%rdx
   e52d0:	or     %rax,%rdx
   e52d3:	test   %rdi,%rdx
   e52d6:	jne    e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e52dc:	lea    (%rcx,%rcx,4),%rax
   e52e0:	shr    $0x8,%rcx
   e52e4:	lea    (%rcx,%rax,2),%r13
   e52e8:	mov    %r13,%rax
   e52eb:	movabs $0xff000000ff,%rcx
   e52f5:	and    %rcx,%rax
   e52f8:	movabs $0xf424000000064,%rdx
   e5302:	imul   %rdx,%rax
   e5306:	shr    $0x10,%r13
   e530a:	and    %rcx,%r13
   e530d:	movabs $0x271000000001,%rcx
   e5317:	imul   %rcx,%r13
   e531b:	add    %rax,%r13
   e531e:	shr    $0x20,%r13
   e5322:	jmp    e57c0 <sessions::fast::parse_events_avx2+0x6e20>
   e5327:	movzbl 0x13(%rbx),%ecx
   e532b:	cmp    $0x2b,%ecx
   e532e:	je     e5339 <sessions::fast::parse_events_avx2+0x6999>
   e5330:	cmp    $0x2d,%ecx
   e5333:	jne    e5686 <sessions::fast::parse_events_avx2+0x6ce6>
   e5339:	mov    %ecx,0x80(%rsp)
   e5340:	mov    (%rbx),%rdx
   e5343:	mov    0x930(%r9),%rcx
   e534a:	imul   %rdx,%rcx
   e534e:	shr    $0x3c,%rcx
   e5352:	cmp    %rdx,0x6e8(%r9,%rcx,8)
   e535a:	mov    %r9,0x18(%rsp)
   e535f:	mov    %r11,%r12
   e5362:	mov    %r10,%rbp
   e5365:	jne    e6fd5 <sessions::fast::parse_events_avx2+0x8635>
   e536b:	mov    0x768(%r9,%rcx,8),%rax
   e5373:	mov    0x7e8(%r9,%rcx,8),%rdx
   e537b:	movabs $0x7676767676767676,%r9
   e5385:	movzwl 0x8(%rbx),%r8d
   e538a:	xor    $0x3030,%r8
   e5391:	mov    0xb(%rbx),%rsi
   e5395:	mov    %rsi,%rcx
   e5398:	movabs $0x3030303030303030,%rdi
   e53a2:	xor    %rdi,%rcx
   e53a5:	lea    0x7676(%r8),%edi
   e53ac:	or     %r8d,%edi
   e53af:	and    $0x8080,%edi
   e53b5:	add    %rcx,%r9
   e53b8:	or     %rsi,%r9
   e53bb:	movabs $0x8080008080008080,%r10
   e53c5:	and    %r10,%r9
   e53c8:	xor    %r10d,%r10d
   e53cb:	cmpb   $0x54,0xa(%rbx)
   e53cf:	setne  %r10b
   e53d3:	movabs $0xff0000ff0000,%r11
   e53dd:	and    %r11,%rsi
   e53e0:	or     %r10,%rsi
   e53e3:	or     %r9,%rsi
   e53e6:	or     %rdi,%rsi
   e53e9:	movabs $0x3a00003a0000,%rdi
   e53f3:	cmp    %rdi,%rsi
   e53f6:	jne    e713b <sessions::fast::parse_events_avx2+0x879b>
   e53fc:	lea    (%rcx,%rcx,4),%rsi
   e5400:	shr    $0x8,%rcx
   e5404:	lea    (%rcx,%rsi,2),%rdi
   e5408:	mov    %rdi,%rcx
   e540b:	shr    $0x30,%rcx
   e540f:	movzbl %cl,%ecx
   e5412:	cmp    $0x3b,%rcx
   e5416:	mov    %rbp,%r10
   e5419:	mov    %r12,%r11
   e541c:	ja     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e5422:	mov    %edi,%esi
   e5424:	shr    $0x18,%esi
   e5427:	cmp    $0x3b,%esi
   e542a:	ja     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e5430:	movzbl %dil,%edi
   e5434:	cmp    $0x17,%edi
   e5437:	ja     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e543d:	movzbl %r8b,%r9d
   e5441:	lea    (%r9,%r9,4),%r9
   e5445:	shr    $0x8,%r8d
   e5449:	lea    (%r8,%r9,2),%r8
   e544d:	test   %r8,%r8
   e5450:	je     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e5456:	cmp    %rdx,%r8
   e5459:	jg     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e545f:	cmpb   $0x3a,0x16(%rbx)
   e5463:	jne    e444e <sessions::fast::parse_events_avx2+0x5aae>
   e5469:	movzbl 0x14(%rbx),%edx
   e546d:	add    $0xd0,%dl
   e5470:	cmp    $0x9,%dl
   e5473:	ja     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e5479:	movzbl 0x15(%rbx),%r9d
   e547e:	add    $0xd0,%r9b
   e5482:	cmp    $0x9,%r9b
   e5486:	ja     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e548c:	mov    %r11,%r12
   e548f:	movzbl 0x17(%rbx),%r11d
   e5494:	add    $0xd0,%r11b
   e5498:	cmp    $0x9,%r11b
   e549c:	ja     e713e <sessions::fast::parse_events_avx2+0x879e>
   e54a2:	mov    %r10,0x58(%rsp)
   e54a7:	movzbl 0x18(%rbx),%r10d
   e54ac:	add    $0xd0,%r10b
   e54b0:	cmp    $0x9,%r10b
   e54b4:	ja     e5cfb <sessions::fast::parse_events_avx2+0x735b>
   e54ba:	movzbl %dl,%edx
   e54bd:	add    %edx,%edx
   e54bf:	lea    (%rdx,%rdx,4),%edx
   e54c2:	add    %r9b,%dl
   e54c5:	cmp    $0x17,%dl
   e54c8:	ja     e5cfb <sessions::fast::parse_events_avx2+0x735b>
   e54ce:	movzbl %r11b,%r9d
   e54d2:	add    %r9d,%r9d
   e54d5:	lea    (%r9,%r9,4),%r9d
   e54d9:	add    %r10b,%r9b
   e54dc:	cmp    $0x3b,%r9b
   e54e0:	ja     e5cfb <sessions::fast::parse_events_avx2+0x735b>
   e54e6:	add    %rax,%r8
   e54e9:	imul   $0x15180,%r8,%rax
   e54f0:	imul   $0xe10,%rdi,%rdi
   e54f7:	imul   $0x3c,%rsi,%rsi
   e54fb:	add    %rcx,%rdi
   e54fe:	add    %rsi,%rdi
   e5501:	add    %rax,%rdi
   e5504:	imul   $0x3e8,%rdi,%rax
   e550b:	add    $0xfffffffffad9a400,%rax
   e5511:	movzbl %r9b,%ecx
   e5515:	movzbl %dl,%edx
   e5518:	imul   $0x36ee80,%rdx,%rdx
   e551f:	imul   $0xea60,%rcx,%rcx
   e5526:	add    %rdx,%rcx
   e5529:	mov    %rcx,%rbp
   e552c:	neg    %rbp
   e552f:	cmpb   $0x2b,0x80(%rsp)
   e5537:	cmovne %rcx,%rbp
   e553b:	add    %rax,%rbp
   e553e:	mov    0x58(%rsp),%r10
   e5543:	mov    %r12,%r11
   e5546:	jmp    e4428 <sessions::fast::parse_events_avx2+0x5a88>
   e554b:	lea    -0x1(%rax),%edx
   e554e:	cmp    $0x10,%edx
   e5551:	jae    e567e <sessions::fast::parse_events_avx2+0x6cde>
   e5557:	mov    %r9,%r12
   e555a:	cmp    $0x9,%eax
   e555d:	movabs $0x8080808080808080,%rdi
   e5567:	movabs $0x7676767676767676,%r8
   e5571:	movabs $0x3030303030303030,%r9
   e557b:	jae    e5874 <sessions::fast::parse_events_avx2+0x6ed4>
   e5581:	lea    0x0(,%rax,8),%ecx
   e5588:	cmp    $0x8,%rax
   e558c:	shrx   %rcx,%r9,%rdx
   e5591:	mov    $0x0,%ecx
   e5596:	cmovne %rdx,%rcx
   e559a:	neg    %al
   e559c:	shl    $0x3,%al
   e559f:	shlx   %rax,(%rbx),%rax
   e55a4:	or     %rax,%rcx
   e55a7:	xor    %r9,%rcx
   e55aa:	lea    (%rcx,%r8,1),%rdx
   e55ae:	or     %rax,%rdx
   e55b1:	test   %rdi,%rdx
   e55b4:	jne    e444e <sessions::fast::parse_events_avx2+0x5aae>
   e55ba:	lea    (%rcx,%rcx,4),%rax
   e55be:	shr    $0x8,%rcx
   e55c2:	lea    (%rcx,%rax,2),%rbp
   e55c6:	mov    %rbp,%rax
   e55c9:	movabs $0xff000000ff,%rcx
   e55d3:	and    %rcx,%rax
   e55d6:	movabs $0xf424000000064,%rdx
   e55e0:	imul   %rdx,%rax
   e55e4:	shr    $0x10,%rbp
   e55e8:	and    %rcx,%rbp
   e55eb:	movabs $0x271000000001,%rcx
   e55f5:	imul   %rcx,%rbp
   e55f9:	add    %rax,%rbp
   e55fc:	shr    $0x20,%rbp
   e5600:	jmp    e5946 <sessions::fast::parse_events_avx2+0x6fa6>
   e5605:	cmp    %ecx,0x10(%rsp)
   e5609:	je     e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e560f:	xor    %ecx,%ecx
   e5611:	xor    %esi,%esi
   e5613:	xor    %edx,%edx
   e5615:	xor    %r13d,%r13d
   e5618:	nopl   0x0(%rax,%rax,1)
   e5620:	movzbl (%rbx,%rsi,1),%edi
   e5624:	add    $0xd0,%dil
   e5628:	cmp    $0x9,%dil
   e562c:	ja     e57ce <sessions::fast::parse_events_avx2+0x6e2e>
   e5632:	test   %dil,%dil
   e5635:	setne  %r8b
   e5639:	or     %r8b,%cl
   e563c:	movzbl %cl,%r8d
   e5640:	and    $0x1,%r8d
   e5644:	add    %r8d,%edx
   e5647:	lea    0x0(,%r13,4),%r8
   e564f:	add    %r13,%r8
   e5652:	movzbl %dil,%edi
   e5656:	lea    (%rdi,%r8,2),%r13
   e565a:	inc    %rsi
   e565d:	cmp    %rsi,%rax
   e5660:	jne    e5620 <sessions::fast::parse_events_avx2+0x6c80>
   e5662:	cmp    $0x14,%edx
   e5665:	setb   %al
   e5668:	test   %r13,%r13
   e566b:	setns  %cl
   e566e:	and    %al,%cl
   e5670:	cmp    $0x1,%cl
   e5673:	je     e57c5 <sessions::fast::parse_events_avx2+0x6e25>
   e5679:	jmp    e57ce <sessions::fast::parse_events_avx2+0x6e2e>
   e567e:	cmp    %ecx,%ebp
   e5680:	je     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e5686:	xor    %ecx,%ecx
   e5688:	xor    %esi,%esi
   e568a:	xor    %edx,%edx
   e568c:	xor    %ebp,%ebp
   e568e:	xchg   %ax,%ax
   e5690:	movzbl (%rbx,%rsi,1),%edi
   e5694:	add    $0xd0,%dil
   e5698:	cmp    $0x9,%dil
   e569c:	ja     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e56a2:	test   %dil,%dil
   e56a5:	setne  %r8b
   e56a9:	or     %r8b,%cl
   e56ac:	movzbl %cl,%r8d
   e56b0:	and    $0x1,%r8d
   e56b4:	add    %r8d,%edx
   e56b7:	lea    0x0(,%rbp,4),%r8
   e56bf:	add    %rbp,%r8
   e56c2:	movzbl %dil,%edi
   e56c6:	lea    (%rdi,%r8,2),%rbp
   e56ca:	inc    %rsi
   e56cd:	cmp    %rsi,%rax
   e56d0:	jne    e5690 <sessions::fast::parse_events_avx2+0x6cf0>
   e56d2:	cmp    $0x14,%edx
   e56d5:	setb   %al
   e56d8:	test   %rbp,%rbp
   e56db:	setns  %cl
   e56de:	and    %al,%cl
   e56e0:	cmp    $0x1,%cl
   e56e3:	jne    e444e <sessions::fast::parse_events_avx2+0x5aae>
   e56e9:	jmp    e5949 <sessions::fast::parse_events_avx2+0x6fa9>
   e56ee:	mov    %eax,%ecx
   e56f0:	add    $0xfffffffffffffff8,%rax
   e56f4:	lea    0x0(,%rax,8),%edx
   e56fb:	cmp    $0x10,%ecx
   e56fe:	shrx   %rdx,%r9,%rcx
   e5703:	mov    $0x0,%edx
   e5708:	cmovae %rdx,%rcx
   e570c:	mov    %eax,%edx
   e570e:	neg    %dl
   e5710:	shl    $0x3,%dl
   e5713:	shlx   %rdx,(%rbx),%rdx
   e5718:	or     %rdx,%rcx
   e571b:	xor    %r9,%rcx
   e571e:	lea    (%rcx,%r8,1),%rsi
   e5722:	or     %rdx,%rsi
   e5725:	test   %rdi,%rsi
   e5728:	jne    e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e572e:	mov    (%rbx,%rax,1),%rax
   e5732:	mov    %rax,%rdx
   e5735:	xor    %r9,%rdx
   e5738:	lea    (%rdx,%r8,1),%rsi
   e573c:	or     %rax,%rsi
   e573f:	test   %rdi,%rsi
   e5742:	jne    e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e5748:	lea    (%rcx,%rcx,4),%rax
   e574c:	shr    $0x8,%rcx
   e5750:	lea    (%rcx,%rax,2),%rax
   e5754:	mov    %rax,%rcx
   e5757:	movabs $0xff000000ff,%rsi
   e5761:	and    %rsi,%rcx
   e5764:	movabs $0xf424000000064,%rdi
   e576e:	imul   %rdi,%rcx
   e5772:	shr    $0x10,%rax
   e5776:	and    %rsi,%rax
   e5779:	movabs $0x271000000001,%r8
   e5783:	imul   %r8,%rax
   e5787:	add    %rcx,%rax
   e578a:	shr    $0x20,%rax
   e578e:	lea    (%rdx,%rdx,4),%rcx
   e5792:	shr    $0x8,%rdx
   e5796:	lea    (%rdx,%rcx,2),%rcx
   e579a:	mov    %rcx,%rdx
   e579d:	and    %rsi,%rdx
   e57a0:	imul   %rdi,%rdx
   e57a4:	shr    $0x10,%rcx
   e57a8:	and    %rsi,%rcx
   e57ab:	imul   %r8,%rcx
   e57af:	add    %rdx,%rcx
   e57b2:	shr    $0x20,%rcx
   e57b6:	imul   $0x5f5e100,%rax,%r13
   e57bd:	add    %rcx,%r13
   e57c0:	mov    0x20(%rsp),%r9
   e57c5:	cmp    %r13,0x938(%r9)
   e57cc:	jle    e57d8 <sessions::fast::parse_events_avx2+0x6e38>
   e57ce:	mov    0x60(%rsp),%r13
   e57d3:	jmp    e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e57d8:	xor    %eax,%eax
   e57da:	cmp    %r13,%r12
   e57dd:	setns  %al
   e57e0:	movabs $0x7fffffffffffffff,%rcx
   e57ea:	add    %rcx,%rax
   e57ed:	sub    %r13,%r12
   e57f0:	cmovo  %rax,%r12
   e57f4:	cmp    0x940(%r9),%r13
   e57fb:	jge    e57ce <sessions::fast::parse_events_avx2+0x6e2e>
   e57fd:	cmp    $0x5265c00,%r12
   e5804:	jg     e57ce <sessions::fast::parse_events_avx2+0x6e2e>
   e5806:	mov    0x50(%rsp),%rdx
   e580b:	and    $0x1,%edx
   e580e:	lea    (%r14,%rdx,2),%ecx
   e5812:	inc    %ecx
   e5814:	mov    0x40(%rsp),%rax
   e5819:	sub    %ecx,%eax
   e581b:	lea    (%r14,%rdx,1),%rcx
   e581f:	inc    %rcx
   e5822:	mov    0x48(%rsp),%r12
   e5827:	mov    (%r12,%rcx,1),%rcx
   e582b:	cmp    $0x8,%eax
   e582e:	jne    e5a6a <sessions::fast::parse_events_avx2+0x70ca>
   e5834:	movabs $0x6573616863727570,%rdx
   e583e:	cmp    %rdx,%rcx
   e5841:	jne    e5a6a <sessions::fast::parse_events_avx2+0x70ca>
   e5847:	mov    %r15,0x10(%rsp)
   e584c:	mov    0x30(%rsp),%rax
   e5851:	and    $0x1,%eax
   e5854:	mov    0x70(%rsp),%r15
   e5859:	lea    (%r15,%rax,2),%edx
   e585d:	inc    %edx
   e585f:	mov    0x60(%rsp),%rcx
   e5864:	cmp    %edx,%ecx
   e5866:	jne    e5ca3 <sessions::fast::parse_events_avx2+0x7303>
   e586c:	mov    %rcx,%r13
   e586f:	jmp    e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e5874:	mov    %eax,%ecx
   e5876:	add    $0xfffffffffffffff8,%rax
   e587a:	lea    0x0(,%rax,8),%edx
   e5881:	cmp    $0x10,%ecx
   e5884:	shrx   %rdx,%r9,%rcx
   e5889:	mov    $0x0,%edx
   e588e:	cmovae %rdx,%rcx
   e5892:	mov    %eax,%edx
   e5894:	neg    %dl
   e5896:	shl    $0x3,%dl
   e5899:	shlx   %rdx,(%rbx),%rdx
   e589e:	or     %rdx,%rcx
   e58a1:	xor    %r9,%rcx
   e58a4:	lea    (%rcx,%r8,1),%rsi
   e58a8:	or     %rdx,%rsi
   e58ab:	test   %rdi,%rsi
   e58ae:	jne    e444e <sessions::fast::parse_events_avx2+0x5aae>
   e58b4:	mov    (%rbx,%rax,1),%rax
   e58b8:	mov    %rax,%rdx
   e58bb:	xor    %r9,%rdx
   e58be:	lea    (%rdx,%r8,1),%rsi
   e58c2:	or     %rax,%rsi
   e58c5:	test   %rdi,%rsi
   e58c8:	jne    e444e <sessions::fast::parse_events_avx2+0x5aae>
   e58ce:	lea    (%rcx,%rcx,4),%rax
   e58d2:	shr    $0x8,%rcx
   e58d6:	lea    (%rcx,%rax,2),%rax
   e58da:	mov    %rax,%rcx
   e58dd:	movabs $0xff000000ff,%rsi
   e58e7:	and    %rsi,%rcx
   e58ea:	movabs $0xf424000000064,%rdi
   e58f4:	imul   %rdi,%rcx
   e58f8:	shr    $0x10,%rax
   e58fc:	and    %rsi,%rax
   e58ff:	movabs $0x271000000001,%r8
   e5909:	imul   %r8,%rax
   e590d:	add    %rcx,%rax
   e5910:	shr    $0x20,%rax
   e5914:	lea    (%rdx,%rdx,4),%rcx
   e5918:	shr    $0x8,%rdx
   e591c:	lea    (%rdx,%rcx,2),%rcx
   e5920:	mov    %rcx,%rdx
   e5923:	and    %rsi,%rdx
   e5926:	imul   %rdi,%rdx
   e592a:	shr    $0x10,%rcx
   e592e:	and    %rsi,%rcx
   e5931:	imul   %r8,%rcx
   e5935:	add    %rdx,%rcx
   e5938:	shr    $0x20,%rcx
   e593c:	imul   $0x5f5e100,%rax,%rbp
   e5943:	add    %rcx,%rbp
   e5946:	mov    %r12,%r9
   e5949:	cmp    %rbp,0x938(%r9)
   e5950:	jg     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e5956:	mov    %r15,%r8
   e5959:	mov    0x10(%rsp),%r12
   e595e:	xor    %eax,%eax
   e5960:	cmp    %rbp,%r14
   e5963:	setns  %al
   e5966:	movabs $0x7fffffffffffffff,%rcx
   e5970:	add    %rcx,%rax
   e5973:	sub    %rbp,%r14
   e5976:	cmovo  %rax,%r14
   e597a:	cmp    0x940(%r9),%rbp
   e5981:	lea    0x110(%rsp),%r15
   e5989:	jge    e444e <sessions::fast::parse_events_avx2+0x5aae>
   e598f:	cmp    $0x5265c00,%r14
   e5996:	jg     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e599c:	mov    0x20(%rsp),%rdi
   e59a1:	lea    0x1(%rdi),%eax
   e59a4:	mov    0x40(%rsp),%rsi
   e59a9:	shrx   %rax,%rsi,%rcx
   e59ae:	and    $0x1,%ecx
   e59b1:	lea    (%rdi,%rcx,2),%edx
   e59b4:	inc    %edx
   e59b6:	mov    %r8d,%eax
   e59b9:	sub    %edx,%eax
   e59bb:	add    %rdi,%rcx
   e59be:	inc    %rcx
   e59c1:	mov    (%r12,%rcx,1),%rcx
   e59c5:	cmp    $0x8,%eax
   e59c8:	jne    e5b9d <sessions::fast::parse_events_avx2+0x71fd>
   e59ce:	movabs $0x6573616863727570,%rdx
   e59d8:	cmp    %rdx,%rcx
   e59db:	jne    e5b9d <sessions::fast::parse_events_avx2+0x71fd>
   e59e1:	mov    0x50(%rsp),%rdx
   e59e6:	lea    0x1(%rdx),%eax
   e59e9:	shrx   %rax,%rsi,%rax
   e59ee:	and    $0x1,%eax
   e59f1:	lea    (%rdx,%rax,2),%ecx
   e59f4:	inc    %ecx
   e59f6:	mov    0x38(%rsp),%rdi
   e59fb:	cmp    %ecx,%edi
   e59fd:	je     e444e <sessions::fast::parse_events_avx2+0x5aae>
   e5a03:	add    %edx,%eax
   e5a05:	inc    %eax
   e5a07:	sub    0x78(%rsp),%edx
   e5a0b:	mov    %rdx,0x50(%rsp)
   e5a10:	sub    %ecx,%edi
   e5a12:	add    %r12,%rax
   e5a15:	lea    (%r8,%r13,1),%rcx
   e5a19:	inc    %rcx
   e5a1c:	xor    %ebx,%ebx
   e5a1e:	xor    %edx,%edx
   e5a20:	movabs $0xe7037ed1a0b428db,%r8
   e5a2a:	mov    0x8(%rsp),%r13
   e5a2f:	cmp    %rdx,%rdi
   e5a32:	je     e5eaa <sessions::fast::parse_events_avx2+0x750a>
   e5a38:	movzbl (%rax,%rdx,1),%esi
   e5a3c:	add    $0xd0,%sil
   e5a40:	cmp    $0x9,%sil
   e5a44:	ja     e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e5a4a:	mov    %rdi,%r14
   e5a4d:	lea    (%rbx,%rbx,4),%edi
   e5a50:	movzbl %sil,%esi
   e5a54:	lea    (%rsi,%rdi,2),%ebx
   e5a57:	mov    %r14,%rdi
   e5a5a:	inc    %rdx
   e5a5d:	cmp    $0x989680,%ebx
   e5a63:	jbe    e5a2f <sessions::fast::parse_events_avx2+0x708f>
   e5a65:	jmp    e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e5a6a:	cmp    $0x77656976,%ecx
   e5a70:	sete   %dl
   e5a73:	cmp    $0x74726163,%ecx
   e5a79:	sete   %cl
   e5a7c:	cmp    $0x4,%eax
   e5a7f:	lea    0x110(%rsp),%r14
   e5a87:	jne    e57ce <sessions::fast::parse_events_avx2+0x6e2e>
   e5a8d:	xor    %ebx,%ebx
   e5a8f:	or     %cl,%dl
   e5a91:	je     e57ce <sessions::fast::parse_events_avx2+0x6e2e>
   e5a97:	mov    0x18(%rsp),%rax
   e5a9c:	mov    0x38(%rsp),%rcx
   e5aa1:	add    %ecx,%eax
   e5aa3:	inc    %eax
   e5aa5:	add    %rax,%r12
   e5aa8:	sub    0x948(%r9),%r13d
   e5aaf:	mov    0xf0(%rsp),%rax
   e5ab7:	mov    %rax,0x50(%rsp)
   e5abc:	mov    0x100(%rsp),%rdi
   e5ac4:	mov    0x108(%rsp),%r9
   e5acc:	cmp    $0xc,%r15d
   e5ad0:	jae    e5d05 <sessions::fast::parse_events_avx2+0x7365>
   e5ad6:	mov    %r15,%rax
   e5ad9:	shl    $0x4,%rax
   e5add:	mov    (%r12),%rcx
   e5ae1:	mov    0x8(%r12),%rdx
   e5ae6:	lea    -0xcbcb5(%rip),%rsi        # 19e38 <sessions::fast::ids::MASKS>
   e5aed:	and    (%rax,%rsi,1),%rcx
   e5af1:	and    0x8(%rax,%rsi,1),%rdx
   e5af6:	shl    $0x38,%r15
   e5afa:	or     %rdx,%r15
   e5afd:	mov    %rcx,%r12
   e5b00:	movabs $0xa0761d6478bd642f,%rax
   e5b0a:	xor    %rax,%rcx
   e5b0d:	mov    %r15,%rdx
   e5b10:	movabs $0xe7037ed1a0b428db,%rax
   e5b1a:	xor    %rax,%rdx
   e5b1d:	mulx   %rcx,%rax,%rbp
   e5b22:	mov    %r15,%rdx
   e5b25:	xor    %rax,%rbp
   e5b28:	mov    0x98(%rdi),%rax
   e5b2f:	mov    0xa0(%rdi),%rcx
   e5b36:	and    %rbp,%rcx
   e5b39:	shl    $0x4,%rcx
   e5b3d:	prefetcht0 (%rax,%rcx,1)
   e5b41:	xor    %r15d,%r15d
   e5b44:	jmp    e601a <sessions::fast::parse_events_avx2+0x767a>
   e5b49:	mov    0xd0(%rsp),%rdi
   e5b51:	mov    0x98(%rsp),%rsi
   e5b59:	mov    0xa8(%rsp),%r12
   e5b61:	mov    %r12,%rdx
   e5b64:	lea    0xe8(%rsp),%rcx
   e5b6c:	vzeroupper
   e5b6f:	call   71100 <sessions::fast::scan::spill::<7, sessions::fast::EventLines<sessions::fast::scan::Avx2>>>
   e5b74:	vpbroadcastb -0xd4db5(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e5b7d:	vpbroadcastb -0xd4dbf(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e5b86:	vpbroadcastb -0xd4dc9(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e5b8f:	cmp    %r12,%rax
   e5b92:	jb     e3180 <sessions::fast::parse_events_avx2+0x47e0>
   e5b98:	jmp    e307d <sessions::fast::parse_events_avx2+0x46dd>
   e5b9d:	cmp    $0x77656976,%ecx
   e5ba3:	sete   %dl
   e5ba6:	cmp    $0x74726163,%ecx
   e5bac:	sete   %cl
   e5baf:	cmp    $0x4,%eax
   e5bb2:	movabs $0xe7037ed1a0b428db,%r8
   e5bbc:	mov    0x8(%rsp),%r13
   e5bc1:	mov    0x68(%rsp),%rsi
   e5bc6:	jne    e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e5bcc:	xor    %r14d,%r14d
   e5bcf:	or     %cl,%dl
   e5bd1:	je     e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e5bd7:	mov    0xc8(%rsp),%rax
   e5bdf:	add    %esi,%eax
   e5be1:	inc    %eax
   e5be3:	mov    0x48(%rsp),%r12
   e5be8:	add    %rax,%r12
   e5beb:	sub    0x948(%r9),%ebp
   e5bf2:	mov    0xf0(%rsp),%rax
   e5bfa:	mov    %rax,0xc8(%rsp)
   e5c02:	mov    0x100(%rsp),%rbx
   e5c0a:	mov    0x108(%rsp),%rax
   e5c12:	mov    %rax,0x38(%rsp)
   e5c17:	mov    0x88(%rsp),%rdi
   e5c1f:	cmp    $0xc,%edi
   e5c22:	mov    %rbx,0x20(%rsp)
   e5c27:	jae    e5d89 <sessions::fast::parse_events_avx2+0x73e9>
   e5c2d:	mov    %rdi,%rax
   e5c30:	shl    $0x4,%rax
   e5c34:	mov    (%r12),%rcx
   e5c38:	mov    0x8(%r12),%rdx
   e5c3d:	lea    -0xcbe0c(%rip),%rsi        # 19e38 <sessions::fast::ids::MASKS>
   e5c44:	and    (%rax,%rsi,1),%rcx
   e5c48:	and    0x8(%rax,%rsi,1),%rdx
   e5c4d:	shl    $0x38,%rdi
   e5c51:	or     %rdx,%rdi
   e5c54:	mov    %rcx,%r12
   e5c57:	movabs $0xa0761d6478bd642f,%rax
   e5c61:	xor    %rax,%rcx
   e5c64:	mov    %rdi,%rdx
   e5c67:	xor    %r8,%rdx
   e5c6a:	mulx   %rcx,%rax,%rcx
   e5c6f:	mov    %rdi,0x50(%rsp)
   e5c74:	mov    %rcx,%rdi
   e5c77:	xor    %rax,%rdi
   e5c7a:	mov    0x98(%rbx),%rax
   e5c81:	mov    0xa0(%rbx),%rcx
   e5c88:	and    %rdi,%rcx
   e5c8b:	shl    $0x4,%rcx
   e5c8f:	prefetcht0 (%rax,%rcx,1)
   e5c93:	xor    %r8d,%r8d
   e5c96:	mov    0x28(%rsp),%r9
   e5c9b:	mov    %rbx,%rsi
   e5c9e:	jmp    e638a <sessions::fast::parse_events_avx2+0x79ea>
   e5ca3:	add    %r15d,%eax
   e5ca6:	inc    %eax
   e5ca8:	sub    %ebp,%r15d
   e5cab:	sub    %edx,%ecx
   e5cad:	add    %r12,%rax
   e5cb0:	mov    0x40(%rsp),%rdx
   e5cb5:	mov    0x8(%rsp),%rsi
   e5cba:	add    %rdx,%rsi
   e5cbd:	inc    %rsi
   e5cc0:	xor    %ebx,%ebx
   e5cc2:	xor    %edx,%edx
   e5cc4:	cmp    %rdx,%rcx
   e5cc7:	je     e5e05 <sessions::fast::parse_events_avx2+0x7465>
   e5ccd:	movzbl (%rax,%rdx,1),%edi
   e5cd1:	add    $0xd0,%dil
   e5cd5:	cmp    $0x9,%dil
   e5cd9:	ja     e57ce <sessions::fast::parse_events_avx2+0x6e2e>
   e5cdf:	lea    (%rbx,%rbx,4),%r8d
   e5ce3:	movzbl %dil,%edi
   e5ce7:	lea    (%rdi,%r8,2),%ebx
   e5ceb:	inc    %rdx
   e5cee:	cmp    $0x989680,%ebx
   e5cf4:	jbe    e5cc4 <sessions::fast::parse_events_avx2+0x7324>
   e5cf6:	jmp    e57ce <sessions::fast::parse_events_avx2+0x6e2e>
   e5cfb:	mov    0x58(%rsp),%r10
   e5d00:	jmp    e713e <sessions::fast::parse_events_avx2+0x879e>
   e5d05:	mov    %r15,%rdx
   e5d08:	movabs $0x589965cc75374cc3,%rax
   e5d12:	imul   %rax,%rdx
   e5d16:	movabs $0x8ebc6af09c88c6e3,%rax
   e5d20:	xor    %rax,%rdx
   e5d23:	lea    -0x8(%r15),%rsi
   e5d27:	shr    $0x3,%rsi
   e5d2b:	movabs $0xe7037ed1a0b428db,%r8
   e5d35:	je     e5fb7 <sessions::fast::parse_events_avx2+0x7617>
   e5d3b:	mov    %rdi,%rbp
   e5d3e:	inc    %rsi
   e5d41:	mov    %rsi,%rdi
   e5d44:	and    $0xfffffffffffffffe,%rdi
   e5d48:	mov    $0x8,%ecx
   e5d4d:	mov    %rcx,%rax
   e5d50:	xor    -0x8(%r12,%rcx,1),%rdx
   e5d55:	mulx   %r8,%rcx,%rdx
   e5d5a:	xor    %rcx,%rdx
   e5d5d:	xor    (%r12,%rax,1),%rdx
   e5d61:	mulx   %r8,%rcx,%rdx
   e5d66:	xor    %rcx,%rdx
   e5d69:	lea    0x10(%rax),%rcx
   e5d6d:	add    $0xfffffffffffffffe,%rdi
   e5d71:	jne    e5d4d <sessions::fast::parse_events_avx2+0x73ad>
   e5d73:	add    $0x8,%rax
   e5d77:	test   $0x1,%sil
   e5d7b:	mov    %rbp,%rdi
   e5d7e:	jne    e5fbe <sessions::fast::parse_events_avx2+0x761e>
   e5d84:	jmp    e5fcd <sessions::fast::parse_events_avx2+0x762d>
   e5d89:	mov    %rdi,%rdx
   e5d8c:	movabs $0x589965cc75374cc3,%rax
   e5d96:	imul   %rax,%rdx
   e5d9a:	movabs $0x8ebc6af09c88c6e3,%rax
   e5da4:	xor    %rax,%rdx
   e5da7:	mov    %rdi,%rbx
   e5daa:	lea    -0x8(%rdi),%rsi
   e5dae:	shr    $0x3,%rsi
   e5db2:	mov    0x28(%rsp),%r9
   e5db7:	je     e6318 <sessions::fast::parse_events_avx2+0x7978>
   e5dbd:	inc    %rsi
   e5dc0:	mov    %rsi,%rdi
   e5dc3:	and    $0xfffffffffffffffe,%rdi
   e5dc7:	mov    $0x8,%ecx
   e5dcc:	mov    %rcx,%rax
   e5dcf:	xor    -0x8(%r12,%rcx,1),%rdx
   e5dd4:	mulx   %r8,%rcx,%rdx
   e5dd9:	xor    %rcx,%rdx
   e5ddc:	xor    (%r12,%rax,1),%rdx
   e5de0:	mulx   %r8,%rcx,%rdx
   e5de5:	xor    %rcx,%rdx
   e5de8:	lea    0x10(%rax),%rcx
   e5dec:	add    $0xfffffffffffffffe,%rdi
   e5df0:	jne    e5dcc <sessions::fast::parse_events_avx2+0x742c>
   e5df2:	add    $0x8,%rax
   e5df6:	test   $0x1,%sil
   e5dfa:	jne    e631f <sessions::fast::parse_events_avx2+0x797f>
   e5e00:	jmp    e632e <sessions::fast::parse_events_avx2+0x798e>
   e5e05:	test   %ebx,%ebx
   e5e07:	je     e57ce <sessions::fast::parse_events_avx2+0x6e2e>
   e5e0d:	cmp    $0xc,%r15d
   e5e11:	lea    0x110(%rsp),%r14
   e5e19:	jae    e71f5 <sessions::fast::parse_events_avx2+0x8855>
   e5e1f:	mov    %r15,%rcx
   e5e22:	shl    $0x4,%rcx
   e5e26:	mov    (%r12,%rsi,1),%rax
   e5e2a:	mov    0x8(%r12,%rsi,1),%rdx
   e5e2f:	lea    -0xcbffe(%rip),%rsi        # 19e38 <sessions::fast::ids::MASKS>
   e5e36:	and    (%rcx,%rsi,1),%rax
   e5e3a:	and    0x8(%rcx,%rsi,1),%rdx
   e5e3f:	shl    $0x38,%r15
   e5e43:	or     %rdx,%r15
   e5e46:	mov    %rax,%rcx
   e5e49:	movabs $0xa0761d6478bd642f,%rdx
   e5e53:	xor    %rdx,%rcx
   e5e56:	mov    %r15,%rdx
   e5e59:	movabs $0xe7037ed1a0b428db,%rsi
   e5e63:	xor    %rsi,%rdx
   e5e66:	mulx   %rcx,%rcx,%rdi
   e5e6b:	xor    %rcx,%rdi
   e5e6e:	mov    0x8(%r9),%rcx
   e5e72:	mov    0x48(%r9),%rdx
   e5e76:	and    %rdx,%rdi
   e5e79:	mov    %rdi,%rsi
   e5e7c:	shl    $0x4,%rsi
   e5e80:	mov    0x8(%rcx,%rsi,1),%r8
   e5e85:	xor    %r15,%r8
   e5e88:	mov    (%rcx,%rsi,1),%rsi
   e5e8c:	xor    %rax,%rsi
   e5e8f:	or     %r8,%rsi
   e5e92:	jne    e66bb <sessions::fast::parse_events_avx2+0x7d1b>
   e5e98:	mov    0x10(%rsp),%r15
   e5e9d:	jmp    e66f7 <sessions::fast::parse_events_avx2+0x7d57>
   e5ea2:	mov    %rbp,%r11
   e5ea5:	jmp    e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e5eaa:	test   %ebx,%ebx
   e5eac:	je     e4453 <sessions::fast::parse_events_avx2+0x5ab3>
   e5eb2:	mov    0x50(%rsp),%rdx
   e5eb7:	cmp    $0xc,%edx
   e5eba:	jae    e7244 <sessions::fast::parse_events_avx2+0x88a4>
   e5ec0:	mov    %rdx,%r14
   e5ec3:	shl    $0x4,%rdx
   e5ec7:	mov    (%r12,%rcx,1),%rax
   e5ecb:	mov    0x8(%r12,%rcx,1),%rcx
   e5ed0:	lea    -0xcc09f(%rip),%rsi        # 19e38 <sessions::fast::ids::MASKS>
   e5ed7:	and    (%rdx,%rsi,1),%rax
   e5edb:	and    0x8(%rdx,%rsi,1),%rcx
   e5ee0:	shl    $0x38,%r14
   e5ee4:	or     %rcx,%r14
   e5ee7:	mov    %rax,%rcx
   e5eea:	movabs $0xa0761d6478bd642f,%rdx
   e5ef4:	xor    %rdx,%rcx
   e5ef7:	mov    %r14,%rdx
   e5efa:	xor    %r8,%rdx
   e5efd:	mulx   %rcx,%rcx,%rdi
   e5f02:	xor    %rcx,%rdi
   e5f05:	mov    0x8(%r9),%rcx
   e5f09:	mov    0x48(%r9),%rdx
   e5f0d:	and    %rdx,%rdi
   e5f10:	mov    %rdi,%rsi
   e5f13:	shl    $0x4,%rsi
   e5f17:	mov    0x8(%rcx,%rsi,1),%r8
   e5f1c:	xor    %r14,%r8
   e5f1f:	mov    (%rcx,%rsi,1),%rsi
   e5f23:	xor    %rax,%rsi
   e5f26:	or     %r8,%rsi
   e5f29:	je     e5f62 <sessions::fast::parse_events_avx2+0x75c2>
   e5f2b:	mov    %r14,%r12
   e5f2e:	mov    %rdi,%rsi
   e5f31:	shl    $0x4,%rsi
   e5f35:	cmpq   $0x0,0x8(%rcx,%rsi,1)
   e5f3b:	je     e6a3c <sessions::fast::parse_events_avx2+0x809c>
   e5f41:	inc    %rdi
   e5f44:	and    %rdx,%rdi
   e5f47:	mov    %rdi,%rsi
   e5f4a:	shl    $0x4,%rsi
   e5f4e:	mov    0x8(%rcx,%rsi,1),%r8
   e5f53:	xor    %r12,%r8
   e5f56:	mov    (%rcx,%rsi,1),%rsi
   e5f5a:	xor    %rax,%rsi
   e5f5d:	or     %r8,%rsi
   e5f60:	jne    e5f2e <sessions::fast::parse_events_avx2+0x758e>
   e5f62:	mov    0x28(%r9),%rsi
   e5f66:	cmp    %rsi,%rdi
   e5f69:	jae    e76f0 <sessions::fast::parse_events_avx2+0x8d50>
   e5f6f:	mov    0x20(%r9),%rax
   e5f73:	mov    (%rax,%rdi,4),%r14d
   e5f77:	mov    $0x1,%eax
   e5f7c:	jmp    e6a3e <sessions::fast::parse_events_avx2+0x809e>
   e5f81:	mov    %r15,%rdi
   e5f84:	mov    %r14,%rdx
   e5f87:	vzeroupper
   e5f8a:	call   b1b20 <<sessions::fast::sink::Sink<sessions::fast::ClickRec>>::refill>
   e5f8f:	vpbroadcastb -0xd51d0(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e5f98:	vpbroadcastb -0xd51da(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e5fa1:	vpbroadcastb -0xd51e4(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e5faa:	mov    0x8(%r15),%rax
   e5fae:	mov    (%rax,%r14,8),%rcx
   e5fb2:	jmp    e4f72 <sessions::fast::parse_events_avx2+0x65d2>
   e5fb7:	mov    $0x8,%ecx
   e5fbc:	xor    %eax,%eax
   e5fbe:	xor    (%r12,%rax,1),%rdx
   e5fc2:	mulx   %r8,%rax,%rdx
   e5fc7:	xor    %rax,%rdx
   e5fca:	mov    %rcx,%rax
   e5fcd:	cmp    %r15,%rax
   e5fd0:	je     e5fed <sessions::fast::parse_events_avx2+0x764d>
   e5fd2:	mov    %r15d,%ecx
   e5fd5:	neg    %ecx
   e5fd7:	shl    $0x3,%ecx
   e5fda:	and    $0x38,%cl
   e5fdd:	mov    $0x40,%esi
   e5fe2:	sub    %ecx,%esi
   e5fe4:	bzhi   %rsi,(%r12,%rax,1),%rax
   e5fea:	xor    %rax,%rdx
   e5fed:	movabs $0xa0761d6478bd642f,%rax
   e5ff7:	mulx   %rax,%rax,%rbp
   e5ffc:	xor    %rax,%rbp
   e5fff:	mov    0xa8(%rdi),%rax
   e6006:	mov    0xb0(%rdi),%rcx
   e600d:	and    %rbp,%rcx
   e6010:	shl    $0x6,%rcx
   e6014:	prefetcht0 (%rax,%rcx,1)
   e6018:	xor    %edx,%edx
   e601a:	mov    0x510(%rsp),%rsi
   e6022:	mov    %esi,%r8d
   e6025:	and    $0xf,%r8d
   e6029:	cmp    $0x10,%rsi
   e602d:	jb     e6d73 <sessions::fast::parse_events_avx2+0x83d3>
   e6033:	mov    %rbp,0x20(%rsp)
   e6038:	mov    %rsi,0x38(%rsp)
   e603d:	mov    %rdx,0x70(%rsp)
   e6042:	mov    %ebx,0x18(%rsp)
   e6046:	mov    %r15,0x10(%rsp)
   e604b:	mov    %r8d,%eax
   e604e:	shl    $0x4,%eax
   e6051:	lea    0x310(%rsp),%rcx
   e6059:	mov    (%rcx,%rax,1),%rcx
   e605d:	mov    %rcx,0x80(%rsp)
   e6065:	mov    0x410(%rsp,%r8,8),%rdx
   e606d:	mov    %r8,0x8(%rsp)
   e6072:	mov    0x4d0(%rsp,%r8,4),%r15d
   e607a:	test   %r15,%r15
   e607d:	mov    %rdx,0x40(%rsp)
   e6082:	mov    %rdi,0x30(%rsp)
   e6087:	je     e620c <sessions::fast::parse_events_avx2+0x786c>
   e608d:	mov    %r9,0x58(%rsp)
   e6092:	mov    %r12,0x48(%rsp)
   e6097:	mov    0xa8(%rdi),%rbx
   e609e:	mov    0xb0(%rdi),%rax
   e60a5:	mov    %rax,0x68(%rsp)
   e60aa:	mov    %rdx,%r12
   e60ad:	mov    %r11,0x90(%rsp)
   e60b5:	jmp    e60c8 <sessions::fast::parse_events_avx2+0x7728>
   e60b7:	inc    %r12
   e60ba:	test   %r14,%r14
   e60bd:	mov    0x40(%rsp),%rdx
   e60c2:	je     e6807 <sessions::fast::parse_events_avx2+0x7e67>
   e60c8:	and    0x68(%rsp),%r12
   e60cd:	mov    %r12,%rax
   e60d0:	shl    $0x6,%rax
   e60d4:	lea    (%rbx,%rax,1),%rbp
   e60d8:	mov    0x8(%rbx,%rax,1),%r14
   e60dd:	cmp    %rdx,(%rbx,%rax,1)
   e60e1:	jne    e60b7 <sessions::fast::parse_events_avx2+0x7717>
   e60e3:	cmp    %r14d,%r15d
   e60e6:	jne    e60b7 <sessions::fast::parse_events_avx2+0x7717>
   e60e8:	cmp    $0x30,%r15d
   e60ec:	jbe    e6164 <sessions::fast::parse_events_avx2+0x77c4>
   e60ee:	mov    0x10(%rbp),%rax
   e60f2:	mov    $0x30,%cl
   e60f4:	bzhi   %rcx,%rax,%rdi
   e60f9:	shr    $0x30,%rax
   e60fd:	and    $0xff,%rax
   e6103:	jne    e610b <sessions::fast::parse_events_avx2+0x776b>
   e6105:	mov    (%rdi),%eax
   e6107:	add    $0x8,%rdi
   e610b:	cmp    %r15d,%eax
   e610e:	jne    e60b7 <sessions::fast::parse_events_avx2+0x7717>
   e6110:	mov    0x80(%rsp),%rsi
   e6118:	mov    %r15,%rdx
   e611b:	mov    %r14,0x78(%rsp)
   e6120:	mov    %r10,%r14
   e6123:	vzeroupper
   e6126:	call   *0x1a350c(%rip)        # 289638 <_GLOBAL_OFFSET_TABLE_+0x20>
   e612c:	mov    0x90(%rsp),%r11
   e6134:	mov    %r14,%r10
   e6137:	mov    0x78(%rsp),%r14
   e613c:	vpbroadcastb -0xd537d(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e6145:	vpbroadcastb -0xd5387(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e614e:	vpbroadcastb -0xd5391(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e6157:	test   %eax,%eax
   e6159:	jne    e60b7 <sessions::fast::parse_events_avx2+0x7717>
   e615f:	jmp    e61e9 <sessions::fast::parse_events_avx2+0x7849>
   e6164:	mov    %r15,%rax
   e6167:	lea    0x0(,%r15,8),%rcx
   e616f:	xor    %edx,%edx
   e6171:	mov    $0xffffffffffffffff,%rsi
   e6178:	shld   %cl,%rsi,%rsi
   e617c:	mov    $0xffffffffffffffff,%r9
   e6183:	shlx   %rcx,%r9,%rdi
   e6188:	test   $0x40,%cl
   e618b:	cmovne %rdi,%rsi
   e618f:	mov    $0x0,%r8d
   e6195:	cmove  %rdi,%r8
   e6199:	vmovdqu 0x10(%rbp,%rdx,1),%xmm0
   e619f:	cmp    $0x10,%rax
   e61a3:	not    %rsi
   e61a6:	not    %r8
   e61a9:	cmovae %r9,%rsi
   e61ad:	cmovae %r9,%r8
   e61b1:	mov    0x80(%rsp),%rdi
   e61b9:	vpxor  (%rdi,%rdx,1),%xmm0,%xmm0
   e61be:	vmovq  %xmm0,%rdi
   e61c3:	and    %r8,%rdi
   e61c6:	vpextrq $0x1,%xmm0,%r8
   e61cc:	and    %rsi,%r8
   e61cf:	or     %rdi,%r8
   e61d2:	jne    e60b7 <sessions::fast::parse_events_avx2+0x7717>
   e61d8:	add    $0x10,%rdx
   e61dc:	add    $0xffffffffffffff80,%rcx
   e61e0:	add    $0xfffffffffffffff0,%rax
   e61e4:	cmp    %r15,%rdx
   e61e7:	jb     e6171 <sessions::fast::parse_events_avx2+0x77d1>
   e61e9:	shr    $0x20,%r14
   e61ed:	mov    %r14,%r15
   e61f0:	lea    0x110(%rsp),%r14
   e61f8:	mov    0x48(%rsp),%r12
   e61fd:	mov    0x58(%rsp),%r9
   e6202:	mov    0x20(%rsp),%rbp
   e6207:	jmp    e6cb4 <sessions::fast::parse_events_avx2+0x8314>
   e620c:	lea    0x310(%rsp),%rcx
   e6214:	mov    0x8(%rcx,%rax,1),%rbx
   e6219:	mov    0x98(%rdi),%rax
   e6220:	mov    0xa0(%rdi),%rcx
   e6227:	and    %rcx,%rdx
   e622a:	mov    %rdx,%r8
   e622d:	shl    $0x4,%r8
   e6231:	lea    (%rax,%r8,1),%rsi
   e6235:	mov    0x8(%rax,%r8,1),%r15
   e623a:	movabs $0xff00000000000000,%rdi
   e6244:	add    $0xffffff,%rdi
   e624b:	mov    0x80(%rsp),%rbp
   e6253:	cmp    %rbp,(%rax,%r8,1)
   e6257:	jne    e6268 <sessions::fast::parse_events_avx2+0x78c8>
   e6259:	mov    %r15,%r8
   e625c:	and    %rdi,%r8
   e625f:	cmp    %rbx,%r8
   e6262:	je     e65e2 <sessions::fast::parse_events_avx2+0x7c42>
   e6268:	test   %r15,%r15
   e626b:	je     e68d7 <sessions::fast::parse_events_avx2+0x7f37>
   e6271:	inc    %rdx
   e6274:	and    %rcx,%rdx
   e6277:	mov    %rdx,%r8
   e627a:	shl    $0x4,%r8
   e627e:	lea    (%rax,%r8,1),%rsi
   e6282:	mov    0x8(%rax,%r8,1),%r15
   e6287:	mov    0x80(%rsp),%rbp
   e628f:	cmp    %rbp,(%rax,%r8,1)
   e6293:	je     e6259 <sessions::fast::parse_events_avx2+0x78b9>
   e6295:	jmp    e6268 <sessions::fast::parse_events_avx2+0x78c8>
   e6297:	mov    %r14,%rsi
   e629a:	mov    %r10,0xa0(%rsp)
   e62a2:	vzeroupper
   e62a5:	call   c6020 <<sessions::fast::ids::Bytes>::refill>
   e62aa:	mov    0x20(%rsp),%r9
   e62af:	mov    0xc8(%rsp),%rdi
   e62b7:	mov    0xa0(%rsp),%r10
   e62bf:	vpbroadcastb -0xd5500(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e62c8:	vpbroadcastb -0xd550a(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e62d1:	vpbroadcastb -0xd5514(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e62da:	mov    (%rdi),%r11
   e62dd:	jmp    e3a1c <sessions::fast::parse_events_avx2+0x507c>
   e62e2:	mov    %rbx,%rdi
   e62e5:	mov    %r13,%rdx
   e62e8:	vzeroupper
   e62eb:	call   b1b20 <<sessions::fast::sink::Sink<sessions::fast::ClickRec>>::refill>
   e62f0:	vpbroadcastb -0xd5531(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e62f9:	vpbroadcastb -0xd553b(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e6302:	vpbroadcastb -0xd5545(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e630b:	mov    0x8(%rbx),%rax
   e630f:	mov    (%rax,%r13,8),%rcx
   e6313:	jmp    e44ca <sessions::fast::parse_events_avx2+0x5b2a>
   e6318:	mov    $0x8,%ecx
   e631d:	xor    %eax,%eax
   e631f:	xor    (%r12,%rax,1),%rdx
   e6323:	mulx   %r8,%rax,%rdx
   e6328:	xor    %rax,%rdx
   e632b:	mov    %rcx,%rax
   e632e:	mov    %rbx,%r8
   e6331:	cmp    %rbx,%rax
   e6334:	je     e6351 <sessions::fast::parse_events_avx2+0x79b1>
   e6336:	mov    %r8d,%ecx
   e6339:	neg    %ecx
   e633b:	shl    $0x3,%ecx
   e633e:	and    $0x38,%cl
   e6341:	mov    $0x40,%esi
   e6346:	sub    %ecx,%esi
   e6348:	bzhi   %rsi,(%r12,%rax,1),%rax
   e634e:	xor    %rax,%rdx
   e6351:	mov    0x20(%rsp),%rsi
   e6356:	movabs $0xa0761d6478bd642f,%rax
   e6360:	mulx   %rax,%rax,%rdi
   e6365:	xor    %rax,%rdi
   e6368:	mov    0xa8(%rsi),%rax
   e636f:	mov    0xb0(%rsi),%rcx
   e6376:	and    %rdi,%rcx
   e6379:	shl    $0x6,%rcx
   e637d:	prefetcht0 (%rax,%rcx,1)
   e6381:	movq   $0x0,0x50(%rsp)
   e638a:	mov    0x510(%rsp),%rax
   e6392:	mov    %eax,%ebx
   e6394:	and    $0xf,%ebx
   e6397:	cmp    $0x10,%rax
   e639b:	jb     e743f <sessions::fast::parse_events_avx2+0x8a9f>
   e63a1:	mov    %rdi,0x90(%rsp)
   e63a9:	mov    %r8,0x88(%rsp)
   e63b1:	mov    %ebx,%eax
   e63b3:	shl    $0x4,%eax
   e63b6:	lea    0x310(%rsp),%rcx
   e63be:	mov    (%rcx,%rax,1),%rcx
   e63c2:	mov    %rcx,0x10(%rsp)
   e63c7:	mov    0x410(%rsp,%rbx,8),%rdx
   e63cf:	mov    %rbx,0x18(%rsp)
   e63d4:	mov    0x4d0(%rsp,%rbx,4),%ebx
   e63db:	test   %rbx,%rbx
   e63de:	mov    %rdx,0x80(%rsp)
   e63e6:	mov    %r14d,0x78(%rsp)
   e63eb:	je     e657f <sessions::fast::parse_events_avx2+0x7bdf>
   e63f1:	mov    %r12,0x48(%rsp)
   e63f6:	mov    0xa8(%rsi),%rax
   e63fd:	mov    %rax,0x68(%rsp)
   e6402:	mov    0xb0(%rsi),%rax
   e6409:	mov    %rax,0x40(%rsp)
   e640e:	mov    %rdx,%r12
   e6411:	jmp    e6427 <sessions::fast::parse_events_avx2+0x7a87>
   e6413:	inc    %r12
   e6416:	test   %r15,%r15
   e6419:	mov    0x80(%rsp),%rdx
   e6421:	je     e69c5 <sessions::fast::parse_events_avx2+0x8025>
   e6427:	and    0x40(%rsp),%r12
   e642c:	mov    %r12,%rax
   e642f:	shl    $0x6,%rax
   e6433:	mov    0x68(%rsp),%rcx
   e6438:	lea    (%rcx,%rax,1),%r14
   e643c:	mov    0x8(%rcx,%rax,1),%r15
   e6441:	cmp    %rdx,(%rcx,%rax,1)
   e6445:	jne    e6413 <sessions::fast::parse_events_avx2+0x7a73>
   e6447:	cmp    %r15d,%ebx
   e644a:	jne    e6413 <sessions::fast::parse_events_avx2+0x7a73>
   e644c:	cmp    $0x30,%ebx
   e644f:	jbe    e64cc <sessions::fast::parse_events_avx2+0x7b2c>
   e6451:	mov    0x10(%r14),%rax
   e6455:	mov    $0x30,%cl
   e6457:	bzhi   %rcx,%rax,%rdi
   e645c:	shr    $0x30,%rax
   e6460:	and    $0xff,%rax
   e6466:	jne    e646e <sessions::fast::parse_events_avx2+0x7ace>
   e6468:	mov    (%rdi),%eax
   e646a:	add    $0x8,%rdi
   e646e:	cmp    %ebx,%eax
   e6470:	jne    e6413 <sessions::fast::parse_events_avx2+0x7a73>
   e6472:	mov    0x10(%rsp),%rsi
   e6477:	mov    %rbx,%rdx
   e647a:	mov    %r15,0xa0(%rsp)
   e6482:	mov    %r10,%r15
   e6485:	mov    %r11,%r13
   e6488:	vzeroupper
   e648b:	call   *0x1a31a7(%rip)        # 289638 <_GLOBAL_OFFSET_TABLE_+0x20>
   e6491:	mov    %r13,%r11
   e6494:	mov    0x8(%rsp),%r13
   e6499:	mov    %r15,%r10
   e649c:	mov    0xa0(%rsp),%r15
   e64a4:	vpbroadcastb -0xd56e5(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e64ad:	vpbroadcastb -0xd56ef(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e64b6:	vpbroadcastb -0xd56f9(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e64bf:	test   %eax,%eax
   e64c1:	jne    e6413 <sessions::fast::parse_events_avx2+0x7a73>
   e64c7:	jmp    e654f <sessions::fast::parse_events_avx2+0x7baf>
   e64cc:	mov    %rbx,%rax
   e64cf:	lea    0x0(,%rbx,8),%rcx
   e64d7:	xor    %edx,%edx
   e64d9:	mov    $0xffffffffffffffff,%rsi
   e64e0:	shld   %cl,%rsi,%rsi
   e64e4:	mov    $0xffffffffffffffff,%r9
   e64eb:	shlx   %rcx,%r9,%rdi
   e64f0:	test   $0x40,%cl
   e64f3:	cmovne %rdi,%rsi
   e64f7:	mov    $0x0,%r8d
   e64fd:	cmove  %rdi,%r8
   e6501:	vmovdqu 0x10(%r14,%rdx,1),%xmm0
   e6508:	cmp    $0x10,%rax
   e650c:	not    %rsi
   e650f:	not    %r8
   e6512:	cmovae %r9,%rsi
   e6516:	cmovae %r9,%r8
   e651a:	mov    0x10(%rsp),%rdi
   e651f:	vpxor  (%rdi,%rdx,1),%xmm0,%xmm0
   e6524:	vmovq  %xmm0,%rdi
   e6529:	and    %r8,%rdi
   e652c:	vpextrq $0x1,%xmm0,%r8
   e6532:	and    %rsi,%r8
   e6535:	or     %rdi,%r8
   e6538:	jne    e6413 <sessions::fast::parse_events_avx2+0x7a73>
   e653e:	add    $0x10,%rdx
   e6542:	add    $0xffffffffffffff80,%rcx
   e6546:	add    $0xfffffffffffffff0,%rax
   e654a:	cmp    %rbx,%rdx
   e654d:	jb     e64d9 <sessions::fast::parse_events_avx2+0x7b39>
   e654f:	shr    $0x20,%r15
   e6553:	mov    %r15,%rbx
   e6556:	lea    0x110(%rsp),%r15
   e655e:	mov    0x48(%rsp),%r12
   e6563:	mov    0x28(%rsp),%r9
   e6568:	mov    0x88(%rsp),%r8
   e6570:	mov    0x38(%rsp),%rdi
   e6575:	mov    0x18(%rsp),%rax
   e657a:	jmp    e7391 <sessions::fast::parse_events_avx2+0x89f1>
   e657f:	lea    0x310(%rsp),%rcx
   e6587:	mov    0x8(%rcx,%rax,1),%rax
   e658c:	mov    %rax,0x48(%rsp)
   e6591:	mov    0x98(%rsi),%rax
   e6598:	mov    0xa0(%rsi),%rcx
   e659f:	and    %rcx,%rdx
   e65a2:	mov    %rdx,%r8
   e65a5:	shl    $0x4,%r8
   e65a9:	lea    (%rax,%r8,1),%rsi
   e65ad:	mov    0x8(%rax,%r8,1),%rbx
   e65b2:	movabs $0xff00000000000000,%rdi
   e65bc:	lea    0xffffff(%rdi),%r9
   e65c3:	mov    0x10(%rsp),%rdi
   e65c8:	cmp    %rdi,(%rax,%r8,1)
   e65cc:	jne    e6a32 <sessions::fast::parse_events_avx2+0x8092>
   e65d2:	mov    %rbx,%r8
   e65d5:	and    %r9,%r8
   e65d8:	mov    0x48(%rsp),%r14
   e65dd:	jmp    e7371 <sessions::fast::parse_events_avx2+0x89d1>
   e65e2:	shr    $0x18,%r15
   e65e6:	mov    0x20(%rsp),%rbp
   e65eb:	jmp    e6cb4 <sessions::fast::parse_events_avx2+0x8314>
   e65f0:	mov    %rsi,0xc8(%rsp)
   e65f8:	mov    0xc8(%rsp),%rsi
   e6600:	mov    %r10,0x58(%rsp)
   e6605:	mov    %rdi,0x30(%rsp)
   e660a:	mov    %r9,0x18(%rsp)
   e660f:	vzeroupper
   e6612:	call   c6020 <<sessions::fast::ids::Bytes>::refill>
   e6617:	mov    0xc8(%rsp),%rsi
   e661f:	mov    0x8(%rsp),%r8
   e6624:	mov    0x18(%rsp),%r9
   e6629:	mov    0x30(%rsp),%rdi
   e662e:	mov    0x58(%rsp),%r10
   e6633:	vpbroadcastb -0xd5874(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e663c:	vpbroadcastb -0xd587e(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e6645:	vpbroadcastb -0xd5888(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e664e:	mov    (%rdi),%r11
   e6651:	jmp    e3af2 <sessions::fast::parse_events_avx2+0x5152>
   e6656:	mov    %r11,%r12
   e6659:	mov    %r10,%r15
   e665c:	add    $0xe8,%rsi
   e6663:	lea    0xb0(%rsp),%rdi
   e666b:	vzeroupper
   e666e:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e6673:	cmpb   $0x0,0xb0(%rsp)
   e667b:	je     e67dd <sessions::fast::parse_events_avx2+0x7e3d>
   e6681:	mov    0xb8(%rsp),%rax
   e6689:	mov    0xc0(%rsp),%rdx
   e6691:	movabs $0x7676767676767676,%r9
   e669b:	vpbroadcastb -0xd58de(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e66a4:	vpbroadcastb -0xd58e6(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e66ad:	vpbroadcastb -0xd58ee(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e66b6:	jmp    e48a2 <sessions::fast::parse_events_avx2+0x5f02>
   e66bb:	mov    %r15,%rbp
   e66be:	mov    0x10(%rsp),%r15
   e66c3:	mov    %rdi,%rsi
   e66c6:	shl    $0x4,%rsi
   e66ca:	cmpq   $0x0,0x8(%rcx,%rsi,1)
   e66d0:	je     e69b6 <sessions::fast::parse_events_avx2+0x8016>
   e66d6:	inc    %rdi
   e66d9:	and    %rdx,%rdi
   e66dc:	mov    %rdi,%rsi
   e66df:	shl    $0x4,%rsi
   e66e3:	mov    0x8(%rcx,%rsi,1),%r8
   e66e8:	xor    %rbp,%r8
   e66eb:	mov    (%rcx,%rsi,1),%rsi
   e66ef:	xor    %rax,%rsi
   e66f2:	or     %r8,%rsi
   e66f5:	jne    e66c3 <sessions::fast::parse_events_avx2+0x7d23>
   e66f7:	mov    0x28(%r9),%rsi
   e66fb:	cmp    %rsi,%rdi
   e66fe:	jae    e76f0 <sessions::fast::parse_events_avx2+0x8d50>
   e6704:	mov    0x20(%r9),%rax
   e6708:	mov    (%rax,%rdi,4),%edx
   e670b:	mov    $0x1,%eax
   e6710:	test   $0x1,%al
   e6712:	jne    e671b <sessions::fast::parse_events_avx2+0x7d7b>
   e6714:	mov    0x9a0(%r9),%edx
   e671b:	shl    $0x18,%edx
   e671e:	or     %ebx,%edx
   e6720:	mov    %edx,%ebx
   e6722:	jmp    e5a97 <sessions::fast::parse_events_avx2+0x70f7>
   e6727:	lea    0xe8(%r9),%rsi
   e672e:	lea    0xb0(%rsp),%rdi
   e6736:	vzeroupper
   e6739:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e673e:	cmpb   $0x0,0xb0(%rsp)
   e6746:	je     e6a64 <sessions::fast::parse_events_avx2+0x80c4>
   e674c:	mov    0xb8(%rsp),%rax
   e6754:	mov    0xc0(%rsp),%rdx
   e675c:	vpbroadcastb -0xd599f(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e6765:	vpbroadcastb -0xd59a7(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e676e:	vpbroadcastb -0xd59af(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e6777:	jmp    e3e94 <sessions::fast::parse_events_avx2+0x54f4>
   e677c:	mov    %r11,%r12
   e677f:	mov    %r10,%r15
   e6782:	add    $0xe8,%rsi
   e6789:	lea    0xb0(%rsp),%rdi
   e6791:	vzeroupper
   e6794:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e6799:	cmpb   $0x0,0xb0(%rsp)
   e67a1:	je     e67dd <sessions::fast::parse_events_avx2+0x7e3d>
   e67a3:	mov    0xb8(%rsp),%rax
   e67ab:	mov    0xc0(%rsp),%rcx
   e67b3:	movabs $0x7676767676767676,%r9
   e67bd:	vpbroadcastb -0xd5a00(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e67c6:	vpbroadcastb -0xd5a08(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e67cf:	vpbroadcastb -0xd5a10(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e67d8:	jmp    e4734 <sessions::fast::parse_events_avx2+0x5d94>
   e67dd:	mov    $0xffffffff,%eax
   e67e2:	mov    %rax,0x28(%rsp)
   e67e7:	vpbroadcastb -0xd5a2a(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e67f0:	vpbroadcastb -0xd5a32(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e67f9:	vpbroadcastb -0xd5a3a(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e6802:	jmp    e4eef <sessions::fast::parse_events_avx2+0x654f>
   e6807:	mov    %r10,0xa0(%rsp)
   e680f:	mov    0x30(%rsp),%rax
   e6814:	mov    0xc8(%rax),%ebx
   e681a:	mov    0xc8(%rsp),%rdi
   e6822:	mov    %rdx,%r14
   e6825:	mov    0x80(%rsp),%rsi
   e682d:	mov    %r15,%rdx
   e6830:	mov    %ebx,%ecx
   e6832:	vzeroupper
   e6835:	call   c5f10 <<sessions::fast::ids::Bytes>::put>
   e683a:	mov    %rax,%r12
   e683d:	mov    %r14,0x0(%rbp)
   e6841:	mov    %rbx,0x78(%rsp)
   e6846:	shl    $0x20,%rbx
   e684a:	or     %r15,%rbx
   e684d:	mov    %rbx,0x8(%rbp)
   e6851:	add    $0x10,%rbp
   e6855:	cmp    $0x31,%r15d
   e6859:	jae    e6a8e <sessions::fast::parse_events_avx2+0x80ee>
   e685f:	mov    %rbp,%rdi
   e6862:	mov    0x80(%rsp),%rsi
   e686a:	mov    %r15,%rdx
   e686d:	call   *0x1a2dbd(%rip)        # 289630 <_GLOBAL_OFFSET_TABLE_+0x18>
   e6873:	jmp    e6a92 <sessions::fast::parse_events_avx2+0x80f2>
   e6878:	lea    0xe8(%r9),%rsi
   e687f:	lea    0xb0(%rsp),%rdi
   e6887:	vzeroupper
   e688a:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e688f:	cmpb   $0x0,0xb0(%rsp)
   e6897:	je     e6bda <sessions::fast::parse_events_avx2+0x823a>
   e689d:	mov    0xb8(%rsp),%rax
   e68a5:	mov    0xc0(%rsp),%rcx
   e68ad:	movabs $0x7676767676767676,%r9
   e68b7:	vpbroadcastb -0xd5afa(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e68c0:	vpbroadcastb -0xd5b02(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e68c9:	vpbroadcastb -0xd5b0a(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e68d2:	jmp    e3d1e <sessions::fast::parse_events_avx2+0x537e>
   e68d7:	mov    %r9,0x58(%rsp)
   e68dc:	mov    %r11,0x90(%rsp)
   e68e4:	mov    %r10,0xa0(%rsp)
   e68ec:	mov    0x30(%rsp),%rcx
   e68f1:	mov    0xc8(%rcx),%eax
   e68f7:	mov    %rax,%rdx
   e68fa:	shl    $0x18,%rdx
   e68fe:	or     %rbx,%rdx
   e6901:	mov    0x80(%rsp),%rdi
   e6909:	mov    %rdi,(%rsi)
   e690c:	mov    %rdx,0x8(%rsi)
   e6910:	mov    %rax,0x78(%rsp)
   e6915:	inc    %eax
   e6917:	mov    %eax,0xc8(%rcx)
   e691d:	movzbl 0xcc(%rcx),%eax
   e6924:	shrx   %rax,0x40(%rsp),%r15
   e692b:	mov    0x68(%rcx),%rax
   e692f:	movzbl (%rax,%r15,1),%esi
   e6934:	mov    %r15,%r14
   e6937:	shl    $0x6,%r14
   e693b:	add    0x50(%rcx),%r14
   e693f:	lea    0x1(%rsi),%rcx
   e6943:	shl    $0x4,%esi
   e6946:	mov    %rdi,(%rsi,%r14,1)
   e694a:	mov    %rdx,0x8(%rsi,%r14,1)
   e694f:	cmp    $0x4,%rcx
   e6953:	jne    e6c04 <sessions::fast::parse_events_avx2+0x8264>
   e6959:	movb   $0x0,(%rax,%r15,1)
   e695e:	mov    0x30(%rsp),%rcx
   e6963:	mov    0x8(%rcx),%rax
   e6967:	mov    0x20(%rcx),%rdx
   e696b:	mov    (%rax,%r15,8),%rcx
   e696f:	cmp    (%rdx,%r15,8),%rcx
   e6973:	je     e72f7 <sessions::fast::parse_events_avx2+0x8957>
   e6979:	vmovaps (%r14),%xmm0
   e697e:	movntdq %xmm0,(%rcx)
   e6982:	lea    0x10(%rcx),%rdx
   e6986:	vmovaps 0x10(%r14),%xmm0
   e698c:	movntdq %xmm0,(%rdx)
   e6990:	lea    0x20(%rcx),%rdx
   e6994:	vmovaps 0x20(%r14),%xmm0
   e699a:	movntdq %xmm0,(%rdx)
   e699e:	add    $0x30,%rcx
   e69a2:	vmovdqa 0x30(%r14),%xmm0
   e69a8:	movntdq %xmm0,(%rcx)
   e69ac:	addq   $0x40,(%rax,%r15,8)
   e69b1:	jmp    e6c08 <sessions::fast::parse_events_avx2+0x8268>
   e69b6:	xor    %eax,%eax
   e69b8:	test   $0x1,%al
   e69ba:	jne    e671b <sessions::fast::parse_events_avx2+0x7d7b>
   e69c0:	jmp    e6714 <sessions::fast::parse_events_avx2+0x7d74>
   e69c5:	mov    %r11,0x70(%rsp)
   e69ca:	mov    %r10,0x58(%rsp)
   e69cf:	mov    0x20(%rsp),%rax
   e69d4:	mov    0xc8(%rax),%r12d
   e69db:	mov    %rdx,%r15
   e69de:	mov    0x30(%rsp),%rdi
   e69e3:	mov    0x10(%rsp),%rsi
   e69e8:	mov    %rbx,%rdx
   e69eb:	mov    %r12d,%ecx
   e69ee:	vzeroupper
   e69f1:	call   c5f10 <<sessions::fast::ids::Bytes>::put>
   e69f6:	mov    %rax,%r13
   e69f9:	mov    %r15,(%r14)
   e69fc:	mov    %r12,0xa0(%rsp)
   e6a04:	shl    $0x20,%r12
   e6a08:	or     %rbx,%r12
   e6a0b:	mov    %r12,0x8(%r14)
   e6a0f:	add    $0x10,%r14
   e6a13:	cmp    $0x31,%ebx
   e6a16:	jae    e6deb <sessions::fast::parse_events_avx2+0x844b>
   e6a1c:	mov    %r14,%rdi
   e6a1f:	mov    0x10(%rsp),%rsi
   e6a24:	mov    %rbx,%rdx
   e6a27:	call   *0x1a2c03(%rip)        # 289630 <_GLOBAL_OFFSET_TABLE_+0x18>
   e6a2d:	jmp    e6dee <sessions::fast::parse_events_avx2+0x844e>
   e6a32:	mov    0x48(%rsp),%r14
   e6a37:	jmp    e7341 <sessions::fast::parse_events_avx2+0x89a1>
   e6a3c:	xor    %eax,%eax
   e6a3e:	movabs $0xe7037ed1a0b428db,%r8
   e6a48:	mov    0x68(%rsp),%rsi
   e6a4d:	test   $0x1,%al
   e6a4f:	jne    e6a58 <sessions::fast::parse_events_avx2+0x80b8>
   e6a51:	mov    0x9a0(%r9),%r14d
   e6a58:	shl    $0x18,%r14d
   e6a5c:	or     %ebx,%r14d
   e6a5f:	jmp    e5bd7 <sessions::fast::parse_events_avx2+0x7237>
   e6a64:	mov    $0xffffffff,%eax
   e6a69:	mov    %rax,0x28(%rsp)
   e6a6e:	vpbroadcastb -0xd5cb1(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e6a77:	vpbroadcastb -0xd5cb9(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e6a80:	vpbroadcastb -0xd5cc1(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e6a89:	jmp    e4448 <sessions::fast::parse_events_avx2+0x5aa8>
   e6a8e:	mov    %r12,0x0(%rbp)
   e6a92:	movabs $0xff00000000000000,%rax
   e6a9c:	or     %rax,%r12
   e6a9f:	mov    0x78(%rsp),%rax
   e6aa4:	inc    %eax
   e6aa6:	mov    0x30(%rsp),%rcx
   e6aab:	mov    %eax,0xc8(%rcx)
   e6ab1:	movzbl 0xcc(%rcx),%eax
   e6ab8:	mov    0x40(%rsp),%rsi
   e6abd:	shrx   %rax,%rsi,%r15
   e6ac2:	mov    0x68(%rcx),%rax
   e6ac6:	movzbl (%rax,%r15,1),%edx
   e6acb:	mov    %r15,%rbx
   e6ace:	shl    $0x6,%rbx
   e6ad2:	add    0x50(%rcx),%rbx
   e6ad6:	lea    0x1(%rdx),%rcx
   e6ada:	shl    $0x4,%edx
   e6add:	mov    %rsi,(%rdx,%rbx,1)
   e6ae1:	mov    %r12,0x8(%rdx,%rbx,1)
   e6ae6:	cmp    $0x4,%rcx
   e6aea:	jne    e6b42 <sessions::fast::parse_events_avx2+0x81a2>
   e6aec:	movb   $0x0,(%rax,%r15,1)
   e6af1:	mov    0x30(%rsp),%rcx
   e6af6:	mov    0x8(%rcx),%rax
   e6afa:	mov    0x20(%rcx),%rdx
   e6afe:	mov    (%rax,%r15,8),%rcx
   e6b02:	cmp    (%rdx,%r15,8),%rcx
   e6b06:	je     e72d5 <sessions::fast::parse_events_avx2+0x8935>
   e6b0c:	vmovaps (%rbx),%xmm0
   e6b10:	movntdq %xmm0,(%rcx)
   e6b14:	lea    0x10(%rcx),%rdx
   e6b18:	vmovaps 0x10(%rbx),%xmm0
   e6b1d:	movntdq %xmm0,(%rdx)
   e6b21:	lea    0x20(%rcx),%rdx
   e6b25:	vmovaps 0x20(%rbx),%xmm0
   e6b2a:	movntdq %xmm0,(%rdx)
   e6b2e:	add    $0x30,%rcx
   e6b32:	vmovdqa 0x30(%rbx),%xmm0
   e6b37:	movntdq %xmm0,(%rcx)
   e6b3b:	addq   $0x40,(%rax,%r15,8)
   e6b40:	jmp    e6b46 <sessions::fast::parse_events_avx2+0x81a6>
   e6b42:	mov    %cl,(%rax,%r15,1)
   e6b46:	mov    0x30(%rsp),%rdx
   e6b4b:	mov    0x80(%rdx),%rax
   e6b52:	cmp    $0xffffffffffffffff,%rax
   e6b56:	je     e6b93 <sessions::fast::parse_events_avx2+0x81f3>
   e6b58:	mov    0x90(%rdx),%rbx
   e6b5f:	cmp    %rax,%rbx
   e6b62:	je     e7146 <sessions::fast::parse_events_avx2+0x87a6>
   e6b68:	mov    0x30(%rsp),%rdx
   e6b6d:	mov    0x88(%rdx),%rax
   e6b74:	mov    %rbx,%rcx
   e6b77:	shl    $0x4,%rcx
   e6b7b:	mov    0x40(%rsp),%rsi
   e6b80:	mov    %rsi,(%rax,%rcx,1)
   e6b84:	mov    %r12,0x8(%rax,%rcx,1)
   e6b89:	inc    %rbx
   e6b8c:	mov    %rbx,0x90(%rdx)
   e6b93:	mov    0xc4(%rdx),%eax
   e6b99:	inc    %eax
   e6b9b:	mov    %eax,0xc4(%rdx)
   e6ba1:	cmp    0xc0(%rdx),%eax
   e6ba7:	jae    e72a5 <sessions::fast::parse_events_avx2+0x8905>
   e6bad:	lea    0x110(%rsp),%r14
   e6bb5:	vpbroadcastb -0xd5df8(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e6bbe:	vpbroadcastb -0xd5e00(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e6bc7:	vpbroadcastb -0xd5e08(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e6bd0:	mov    0x48(%rsp),%r12
   e6bd5:	jmp    e6c95 <sessions::fast::parse_events_avx2+0x82f5>
   e6bda:	mov    $0xffffffff,%eax
   e6bdf:	mov    %rax,0x28(%rsp)
   e6be4:	vpbroadcastb -0xd5e27(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e6bed:	vpbroadcastb -0xd5e2f(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e6bf6:	vpbroadcastb -0xd5e37(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e6bff:	jmp    e4623 <sessions::fast::parse_events_avx2+0x5c83>
   e6c04:	mov    %cl,(%rax,%r15,1)
   e6c08:	mov    0x30(%rsp),%rdx
   e6c0d:	mov    0x80(%rdx),%rax
   e6c14:	cmp    $0xffffffffffffffff,%rax
   e6c18:	je     e6c58 <sessions::fast::parse_events_avx2+0x82b8>
   e6c1a:	mov    0x90(%rdx),%r14
   e6c21:	cmp    %rax,%r14
   e6c24:	je     e715c <sessions::fast::parse_events_avx2+0x87bc>
   e6c2a:	mov    0x30(%rsp),%rdx
   e6c2f:	mov    0x88(%rdx),%rax
   e6c36:	mov    %r14,%rcx
   e6c39:	shl    $0x4,%rcx
   e6c3d:	mov    0x80(%rsp),%rsi
   e6c45:	mov    %rsi,(%rax,%rcx,1)
   e6c49:	mov    %rbx,0x8(%rax,%rcx,1)
   e6c4e:	inc    %r14
   e6c51:	mov    %r14,0x90(%rdx)
   e6c58:	mov    0xbc(%rdx),%eax
   e6c5e:	inc    %eax
   e6c60:	mov    %eax,0xbc(%rdx)
   e6c66:	cmp    0xb8(%rdx),%eax
   e6c6c:	jae    e72b4 <sessions::fast::parse_events_avx2+0x8914>
   e6c72:	lea    0x110(%rsp),%r14
   e6c7a:	vpbroadcastb -0xd5ebd(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e6c83:	vpbroadcastb -0xd5ec5(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e6c8c:	vpbroadcastb -0xd5ecd(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e6c95:	mov    0xa0(%rsp),%r10
   e6c9d:	mov    0x90(%rsp),%r11
   e6ca5:	mov    0x58(%rsp),%r9
   e6caa:	mov    0x20(%rsp),%rbp
   e6caf:	mov    0x78(%rsp),%r15
   e6cb4:	mov    0x8(%rsp),%r8
   e6cb9:	mov    %r8d,%edx
   e6cbc:	shl    $0x5,%edx
   e6cbf:	mov    %r15d,0x10(%r14,%rdx,1)
   e6cc4:	mov    0x490(%rsp,%r8,4),%r15d
   e6ccc:	mov    0x68(%r9),%rax
   e6cd0:	movzbl (%rax,%r15,1),%esi
   e6cd5:	mov    %r15,%rbx
   e6cd8:	shl    $0x6,%rbx
   e6cdc:	add    0x50(%r9),%rbx
   e6ce0:	lea    0x1(%rsi),%rcx
   e6ce4:	shl    $0x5,%esi
   e6ce7:	vmovdqu (%r14,%rdx,1),%ymm0
   e6ced:	vmovdqu %ymm0,(%rsi,%rbx,1)
   e6cf2:	cmp    $0x2,%rcx
   e6cf6:	jne    e6d5c <sessions::fast::parse_events_avx2+0x83bc>
   e6cf8:	movb   $0x0,(%rax,%r15,1)
   e6cfd:	mov    0x8(%r9),%rax
   e6d01:	mov    0x20(%r9),%rdx
   e6d05:	mov    (%rax,%r15,8),%rcx
   e6d09:	cmp    (%rdx,%r15,8),%rcx
   e6d0d:	mov    0x38(%rsp),%rsi
   e6d12:	je     e718b <sessions::fast::parse_events_avx2+0x87eb>
   e6d18:	vmovaps (%rbx),%xmm0
   e6d1c:	movntdq %xmm0,(%rcx)
   e6d20:	lea    0x10(%rcx),%rdx
   e6d24:	vmovaps 0x10(%rbx),%xmm0
   e6d29:	movntdq %xmm0,(%rdx)
   e6d2d:	lea    0x20(%rcx),%rdx
   e6d31:	vmovaps 0x20(%rbx),%xmm0
   e6d36:	movntdq %xmm0,(%rdx)
   e6d3a:	add    $0x30,%rcx
   e6d3e:	vmovdqa 0x30(%rbx),%xmm0
   e6d43:	movntdq %xmm0,(%rcx)
   e6d47:	addq   $0x40,(%rax,%r15,8)
   e6d4c:	mov    0x10(%rsp),%r15
   e6d51:	mov    0x18(%rsp),%ebx
   e6d55:	mov    0x70(%rsp),%rdx
   e6d5a:	jmp    e6d73 <sessions::fast::parse_events_avx2+0x83d3>
   e6d5c:	mov    %cl,(%rax,%r15,1)
   e6d60:	mov    0x10(%rsp),%r15
   e6d65:	mov    0x18(%rsp),%ebx
   e6d69:	mov    0x70(%rsp),%rdx
   e6d6e:	mov    0x38(%rsp),%rsi
   e6d73:	mov    %r8d,%eax
   e6d76:	shl    $0x5,%eax
   e6d79:	mov    %r10,(%r14,%rax,1)
   e6d7d:	mov    %r11,0x8(%r14,%rax,1)
   e6d82:	movl   $0x0,0x10(%r14,%rax,1)
   e6d8b:	mov    %r13d,0x14(%r14,%rax,1)
   e6d90:	mov    %ebx,0x18(%r14,%rax,1)
   e6d95:	mov    0x28(%rsp),%rcx
   e6d9a:	mov    %ecx,0x1c(%r14,%rax,1)
   e6d9f:	mov    %r8d,%eax
   e6da2:	shl    $0x4,%eax
   e6da5:	lea    0x310(%rsp),%rcx
   e6dad:	mov    %r12,(%rcx,%rax,1)
   e6db1:	mov    %rdx,0x8(%rcx,%rax,1)
   e6db6:	mov    %rbp,0x410(%rsp,%r8,8)
   e6dbe:	mov    0x88(%rsp),%rax
   e6dc6:	mov    %eax,0x490(%rsp,%r8,4)
   e6dce:	mov    %r15d,0x4d0(%rsp,%r8,4)
   e6dd6:	inc    %rsi
   e6dd9:	mov    %rsi,0x510(%rsp)
   e6de1:	mov    0x60(%rsp),%r13
   e6de6:	jmp    e4fb0 <sessions::fast::parse_events_avx2+0x6610>
   e6deb:	mov    %r13,(%r14)
   e6dee:	movabs $0xff00000000000000,%rax
   e6df8:	or     %rax,%r13
   e6dfb:	mov    0xa0(%rsp),%rax
   e6e03:	inc    %eax
   e6e05:	mov    0x20(%rsp),%rcx
   e6e0a:	mov    %eax,0xc8(%rcx)
   e6e10:	movzbl 0xcc(%rcx),%eax
   e6e17:	mov    0x80(%rsp),%rsi
   e6e1f:	shrx   %rax,%rsi,%rbx
   e6e24:	mov    0x68(%rcx),%rax
   e6e28:	movzbl (%rax,%rbx,1),%edx
   e6e2c:	mov    %rbx,%r14
   e6e2f:	shl    $0x6,%r14
   e6e33:	add    0x50(%rcx),%r14
   e6e37:	lea    0x1(%rdx),%rcx
   e6e3b:	shl    $0x4,%edx
   e6e3e:	mov    %rsi,(%rdx,%r14,1)
   e6e42:	mov    %r13,%r12
   e6e45:	mov    %r13,0x8(%rdx,%r14,1)
   e6e4a:	cmp    $0x4,%rcx
   e6e4e:	jne    e6ea9 <sessions::fast::parse_events_avx2+0x8509>
   e6e50:	movb   $0x0,(%rax,%rbx,1)
   e6e54:	mov    0x20(%rsp),%rcx
   e6e59:	mov    0x8(%rcx),%rax
   e6e5d:	mov    0x20(%rcx),%rdx
   e6e61:	mov    (%rax,%rbx,8),%rcx
   e6e65:	cmp    (%rdx,%rbx,8),%rcx
   e6e69:	je     e731c <sessions::fast::parse_events_avx2+0x897c>
   e6e6f:	vmovaps (%r14),%xmm0
   e6e74:	movntdq %xmm0,(%rcx)
   e6e78:	lea    0x10(%rcx),%rdx
   e6e7c:	vmovaps 0x10(%r14),%xmm0
   e6e82:	movntdq %xmm0,(%rdx)
   e6e86:	lea    0x20(%rcx),%rdx
   e6e8a:	vmovaps 0x20(%r14),%xmm0
   e6e90:	movntdq %xmm0,(%rdx)
   e6e94:	add    $0x30,%rcx
   e6e98:	vmovdqa 0x30(%r14),%xmm0
   e6e9e:	movntdq %xmm0,(%rcx)
   e6ea2:	addq   $0x40,(%rax,%rbx,8)
   e6ea7:	jmp    e6eac <sessions::fast::parse_events_avx2+0x850c>
   e6ea9:	mov    %cl,(%rax,%rbx,1)
   e6eac:	mov    0x20(%rsp),%rdx
   e6eb1:	mov    0x80(%rdx),%rax
   e6eb8:	cmp    $0xffffffffffffffff,%rax
   e6ebc:	je     e6efc <sessions::fast::parse_events_avx2+0x855c>
   e6ebe:	mov    0x90(%rdx),%rbx
   e6ec5:	cmp    %rax,%rbx
   e6ec8:	je     e7175 <sessions::fast::parse_events_avx2+0x87d5>
   e6ece:	mov    0x20(%rsp),%rdx
   e6ed3:	mov    0x88(%rdx),%rax
   e6eda:	mov    %rbx,%rcx
   e6edd:	shl    $0x4,%rcx
   e6ee1:	mov    0x80(%rsp),%rsi
   e6ee9:	mov    %rsi,(%rax,%rcx,1)
   e6eed:	mov    %r12,0x8(%rax,%rcx,1)
   e6ef2:	inc    %rbx
   e6ef5:	mov    %rbx,0x90(%rdx)
   e6efc:	mov    0xc4(%rdx),%eax
   e6f02:	inc    %eax
   e6f04:	mov    %eax,0xc4(%rdx)
   e6f0a:	cmp    0xc0(%rdx),%eax
   e6f10:	jae    e72c6 <sessions::fast::parse_events_avx2+0x8926>
   e6f16:	lea    0x110(%rsp),%r15
   e6f1e:	vpbroadcastb -0xd6161(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e6f27:	vpbroadcastb -0xd6169(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e6f30:	vpbroadcastb -0xd6171(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e6f39:	mov    0x48(%rsp),%r12
   e6f3e:	mov    0x58(%rsp),%r10
   e6f43:	mov    0x70(%rsp),%r11
   e6f48:	mov    0x8(%rsp),%r13
   e6f4d:	mov    0x28(%rsp),%r9
   e6f52:	mov    0x88(%rsp),%r8
   e6f5a:	mov    0x38(%rsp),%rdi
   e6f5f:	mov    0x18(%rsp),%rax
   e6f64:	mov    0xa0(%rsp),%rbx
   e6f6c:	jmp    e7391 <sessions::fast::parse_events_avx2+0x89f1>
   e6f71:	lea    0xe8(%r9),%rsi
   e6f78:	lea    0xb0(%rsp),%rdi
   e6f80:	vzeroupper
   e6f83:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e6f88:	cmpb   $0x0,0xb0(%rsp)
   e6f90:	je     e709a <sessions::fast::parse_events_avx2+0x86fa>
   e6f96:	mov    0xb8(%rsp),%rax
   e6f9e:	mov    0xc0(%rsp),%rdx
   e6fa6:	movabs $0x7676767676767676,%r9
   e6fb0:	vpbroadcastb -0xd61f3(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e6fb9:	vpbroadcastb -0xd61fb(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e6fc2:	vpbroadcastb -0xd6203(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e6fcb:	mov    0x60(%rsp),%r13
   e6fd0:	jmp    e50b1 <sessions::fast::parse_events_avx2+0x6711>
   e6fd5:	lea    0xe8(%r9),%rsi
   e6fdc:	lea    0xb0(%rsp),%rdi
   e6fe4:	vzeroupper
   e6fe7:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e6fec:	cmpb   $0x0,0xb0(%rsp)
   e6ff4:	je     e7120 <sessions::fast::parse_events_avx2+0x8780>
   e6ffa:	mov    0xb8(%rsp),%rax
   e7002:	mov    0xc0(%rsp),%rdx
   e700a:	movabs $0x7676767676767676,%r9
   e7014:	vpbroadcastb -0xd6257(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e701d:	vpbroadcastb -0xd625f(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e7026:	vpbroadcastb -0xd6267(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e702f:	jmp    e5385 <sessions::fast::parse_events_avx2+0x69e5>
   e7034:	mov    %r11,%rbp
   e7037:	mov    %r10,%r15
   e703a:	lea    0xe8(%r9),%rsi
   e7041:	lea    0xb0(%rsp),%rdi
   e7049:	vzeroupper
   e704c:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e7051:	cmpb   $0x0,0xb0(%rsp)
   e7059:	je     e709a <sessions::fast::parse_events_avx2+0x86fa>
   e705b:	mov    0xb8(%rsp),%rax
   e7063:	mov    0xc0(%rsp),%rcx
   e706b:	movabs $0x7676767676767676,%r9
   e7075:	vpbroadcastb -0xd62b8(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e707e:	vpbroadcastb -0xd62c0(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e7087:	vpbroadcastb -0xd62c8(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e7090:	mov    0x60(%rsp),%r13
   e7095:	jmp    e4cd7 <sessions::fast::parse_events_avx2+0x6337>
   e709a:	vpbroadcastb -0xd62dd(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e70a3:	vpbroadcastb -0xd62e5(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e70ac:	vpbroadcastb -0xd62ed(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e70b5:	mov    0x60(%rsp),%r13
   e70ba:	mov    %r15,%r10
   e70bd:	mov    %rbp,%r11
   e70c0:	jmp    e4ef5 <sessions::fast::parse_events_avx2+0x6555>
   e70c5:	lea    0xe8(%r9),%rsi
   e70cc:	lea    0xb0(%rsp),%rdi
   e70d4:	vzeroupper
   e70d7:	call   a9850 <<sessions::fast::ts::Calendar>::month_slow>
   e70dc:	cmpb   $0x0,0xb0(%rsp)
   e70e4:	je     e7120 <sessions::fast::parse_events_avx2+0x8780>
   e70e6:	mov    0xb8(%rsp),%rax
   e70ee:	mov    0xc0(%rsp),%rcx
   e70f6:	movabs $0x7676767676767676,%r9
   e7100:	vpbroadcastb -0xd6343(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e7109:	vpbroadcastb -0xd634b(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e7112:	vpbroadcastb -0xd6353(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e711b:	jmp    e4330 <sessions::fast::parse_events_avx2+0x5990>
   e7120:	vpbroadcastb -0xd6363(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e7129:	vpbroadcastb -0xd636b(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e7132:	vpbroadcastb -0xd6373(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e713b:	mov    %rbp,%r10
   e713e:	mov    %r12,%r11
   e7141:	jmp    e444e <sessions::fast::parse_events_avx2+0x5aae>
   e7146:	mov    0x30(%rsp),%rax
   e714b:	lea    0x80(%rax),%rdi
   e7152:	call   b2cd0 <<alloc::raw_vec::RawVec<[u64; 2]>>::grow_one>
   e7157:	jmp    e6b68 <sessions::fast::parse_events_avx2+0x81c8>
   e715c:	mov    0x30(%rsp),%rax
   e7161:	lea    0x80(%rax),%rdi
   e7168:	vzeroupper
   e716b:	call   b2cd0 <<alloc::raw_vec::RawVec<[u64; 2]>>::grow_one>
   e7170:	jmp    e6c2a <sessions::fast::parse_events_avx2+0x828a>
   e7175:	mov    0x20(%rsp),%rax
   e717a:	lea    0x80(%rax),%rdi
   e7181:	call   b2cd0 <<alloc::raw_vec::RawVec<[u64; 2]>>::grow_one>
   e7186:	jmp    e6ece <sessions::fast::parse_events_avx2+0x852e>
   e718b:	mov    %r9,%rdi
   e718e:	mov    0x50(%rsp),%rsi
   e7193:	mov    %r15,%rdx
   e7196:	mov    %r10,0xa0(%rsp)
   e719e:	mov    %r11,%rbp
   e71a1:	mov    %r9,0x58(%rsp)
   e71a6:	vzeroupper
   e71a9:	call   b1b20 <<sessions::fast::sink::Sink<sessions::fast::ClickRec>>::refill>
   e71ae:	mov    0x8(%rsp),%r8
   e71b3:	mov    0x38(%rsp),%rsi
   e71b8:	mov    %rbp,%r11
   e71bb:	mov    0x20(%rsp),%rbp
   e71c0:	mov    0xa0(%rsp),%r10
   e71c8:	vpbroadcastb -0xd6409(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e71d1:	vpbroadcastb -0xd6413(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e71da:	vpbroadcastb -0xd641d(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e71e3:	mov    0x58(%rsp),%rax
   e71e8:	mov    0x8(%rax),%rax
   e71ec:	mov    (%rax,%r15,8),%rcx
   e71f0:	jmp    e6d18 <sessions::fast::parse_events_avx2+0x8378>
   e71f5:	add    %r12,%rsi
   e71f8:	mov    %r9,%rdi
   e71fb:	mov    %r15,%rdx
   e71fe:	mov    %r10,%r15
   e7201:	mov    %r11,%rbp
   e7204:	vzeroupper
   e7207:	call   b43f0 <<sessions::fast::ids::KeyMap>::get_long>
   e720c:	mov    0x20(%rsp),%r9
   e7211:	mov    %rbp,%r11
   e7214:	mov    %r15,%r10
   e7217:	vpbroadcastb -0xd6458(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e7220:	vpbroadcastb -0xd6462(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e7229:	vpbroadcastb -0xd646c(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e7232:	mov    0x10(%rsp),%r15
   e7237:	test   $0x1,%al
   e7239:	je     e6714 <sessions::fast::parse_events_avx2+0x7d74>
   e723f:	jmp    e671b <sessions::fast::parse_events_avx2+0x7d7b>
   e7244:	mov    %r12,%rsi
   e7247:	add    %rcx,%rsi
   e724a:	mov    %r9,%rdi
   e724d:	mov    %r10,%r14
   e7250:	mov    %r11,%r12
   e7253:	mov    %r9,0x18(%rsp)
   e7258:	vzeroupper
   e725b:	call   b43f0 <<sessions::fast::ids::KeyMap>::get_long>
   e7260:	mov    0x18(%rsp),%r9
   e7265:	mov    %r12,%r11
   e7268:	mov    %r14,%r10
   e726b:	vpbroadcastb -0xd64ac(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e7274:	vpbroadcastb -0xd64b6(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e727d:	vpbroadcastb -0xd64c0(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e7286:	movabs $0xe7037ed1a0b428db,%r8
   e7290:	mov    %edx,%r14d
   e7293:	mov    0x68(%rsp),%rsi
   e7298:	test   $0x1,%al
   e729a:	je     e6a51 <sessions::fast::parse_events_avx2+0x80b1>
   e72a0:	jmp    e6a58 <sessions::fast::parse_events_avx2+0x80b8>
   e72a5:	mov    0x30(%rsp),%rdi
   e72aa:	call   b10e0 <<sessions::fast::ids::Interner>::grow_wide>
   e72af:	jmp    e6bad <sessions::fast::parse_events_avx2+0x820d>
   e72b4:	mov    0x30(%rsp),%rdi
   e72b9:	vzeroupper
   e72bc:	call   b0f90 <<sessions::fast::ids::Interner>::grow>
   e72c1:	jmp    e6c72 <sessions::fast::parse_events_avx2+0x82d2>
   e72c6:	mov    0x20(%rsp),%rdi
   e72cb:	call   b10e0 <<sessions::fast::ids::Interner>::grow_wide>
   e72d0:	jmp    e6f16 <sessions::fast::parse_events_avx2+0x8576>
   e72d5:	mov    0x30(%rsp),%r14
   e72da:	mov    %r14,%rdi
   e72dd:	mov    0x50(%rsp),%rsi
   e72e2:	mov    %r15,%rdx
   e72e5:	call   b1380 <<sessions::fast::sink::Sink<[u64; 2]>>::refill>
   e72ea:	mov    0x8(%r14),%rax
   e72ee:	mov    (%rax,%r15,8),%rcx
   e72f2:	jmp    e6b0c <sessions::fast::parse_events_avx2+0x816c>
   e72f7:	mov    0x30(%rsp),%rbp
   e72fc:	mov    %rbp,%rdi
   e72ff:	mov    0x50(%rsp),%rsi
   e7304:	mov    %r15,%rdx
   e7307:	vzeroupper
   e730a:	call   b1380 <<sessions::fast::sink::Sink<[u64; 2]>>::refill>
   e730f:	mov    0x8(%rbp),%rax
   e7313:	mov    (%rax,%r15,8),%rcx
   e7317:	jmp    e6979 <sessions::fast::parse_events_avx2+0x7fd9>
   e731c:	mov    0x20(%rsp),%r15
   e7321:	mov    %r15,%rdi
   e7324:	mov    0xc8(%rsp),%rsi
   e732c:	mov    %rbx,%rdx
   e732f:	call   b1380 <<sessions::fast::sink::Sink<[u64; 2]>>::refill>
   e7334:	mov    0x8(%r15),%rax
   e7338:	mov    (%rax,%rbx,8),%rcx
   e733c:	jmp    e6e6f <sessions::fast::parse_events_avx2+0x84cf>
   e7341:	test   %rbx,%rbx
   e7344:	je     e74a8 <sessions::fast::parse_events_avx2+0x8b08>
   e734a:	inc    %rdx
   e734d:	and    %rcx,%rdx
   e7350:	mov    %rdx,%r8
   e7353:	shl    $0x4,%r8
   e7357:	lea    (%rax,%r8,1),%rsi
   e735b:	mov    0x8(%rax,%r8,1),%rbx
   e7360:	mov    0x10(%rsp),%rdi
   e7365:	cmp    %rdi,(%rax,%r8,1)
   e7369:	jne    e7341 <sessions::fast::parse_events_avx2+0x89a1>
   e736b:	mov    %rbx,%r8
   e736e:	and    %r9,%r8
   e7371:	cmp    %r14,%r8
   e7374:	jne    e7341 <sessions::fast::parse_events_avx2+0x89a1>
   e7376:	shr    $0x18,%rbx
   e737a:	mov    0x88(%rsp),%r8
   e7382:	mov    0x38(%rsp),%rdi
   e7387:	mov    0x18(%rsp),%rax
   e738c:	mov    0x28(%rsp),%r9
   e7391:	mov    %eax,%edx
   e7393:	shl    $0x5,%edx
   e7396:	mov    %ebx,0x10(%r15,%rdx,1)
   e739b:	mov    0x490(%rsp,%rax,4),%ebx
   e73a2:	mov    0x68(%rdi),%rax
   e73a6:	movzbl (%rax,%rbx,1),%esi
   e73aa:	mov    %rbx,%r14
   e73ad:	shl    $0x6,%r14
   e73b1:	add    0x50(%rdi),%r14
   e73b5:	lea    0x1(%rsi),%rcx
   e73b9:	shl    $0x5,%esi
   e73bc:	vmovdqu (%r15,%rdx,1),%ymm0
   e73c2:	vmovdqu %ymm0,(%rsi,%r14,1)
   e73c8:	cmp    $0x2,%rcx
   e73cc:	jne    e7422 <sessions::fast::parse_events_avx2+0x8a82>
   e73ce:	movb   $0x0,(%rax,%rbx,1)
   e73d2:	mov    0x8(%rdi),%rax
   e73d6:	mov    0x20(%rdi),%rdx
   e73da:	mov    (%rax,%rbx,8),%rcx
   e73de:	cmp    (%rdx,%rbx,8),%rcx
   e73e2:	je     e7640 <sessions::fast::parse_events_avx2+0x8ca0>
   e73e8:	vmovaps (%r14),%xmm0
   e73ed:	movntdq %xmm0,(%rcx)
   e73f1:	lea    0x10(%rcx),%rdx
   e73f5:	vmovaps 0x10(%r14),%xmm0
   e73fb:	movntdq %xmm0,(%rdx)
   e73ff:	lea    0x20(%rcx),%rdx
   e7403:	vmovaps 0x20(%r14),%xmm0
   e7409:	movntdq %xmm0,(%rdx)
   e740d:	add    $0x30,%rcx
   e7411:	vmovdqa 0x30(%r14),%xmm0
   e7417:	movntdq %xmm0,(%rcx)
   e741b:	addq   $0x40,(%rax,%rbx,8)
   e7420:	jmp    e7425 <sessions::fast::parse_events_avx2+0x8a85>
   e7422:	mov    %cl,(%rax,%rbx,1)
   e7425:	mov    0x510(%rsp),%rax
   e742d:	mov    0x78(%rsp),%r14d
   e7432:	mov    0x90(%rsp),%rdi
   e743a:	mov    0x18(%rsp),%rbx
   e743f:	mov    %ebx,%ecx
   e7441:	shl    $0x5,%ecx
   e7444:	mov    %r10,(%r15,%rcx,1)
   e7448:	mov    %r11,0x8(%r15,%rcx,1)
   e744d:	movl   $0x0,0x10(%r15,%rcx,1)
   e7456:	mov    %ebp,0x14(%r15,%rcx,1)
   e745b:	mov    %r14d,0x18(%r15,%rcx,1)
   e7460:	mov    %r9d,0x1c(%r15,%rcx,1)
   e7465:	mov    %ebx,%ecx
   e7467:	shl    $0x4,%ecx
   e746a:	lea    0x310(%rsp),%rdx
   e7472:	mov    %r12,(%rdx,%rcx,1)
   e7476:	mov    0x50(%rsp),%rsi
   e747b:	mov    %rsi,0x8(%rdx,%rcx,1)
   e7480:	mov    %rdi,0x410(%rsp,%rbx,8)
   e7488:	mov    %r13d,0x490(%rsp,%rbx,4)
   e7490:	mov    %r8d,0x4d0(%rsp,%rbx,4)
   e7498:	inc    %rax
   e749b:	mov    %rax,0x510(%rsp)
   e74a3:	jmp    e4510 <sessions::fast::parse_events_avx2+0x5b70>
   e74a8:	mov    %r11,0x70(%rsp)
   e74ad:	mov    %r10,0x58(%rsp)
   e74b2:	mov    %r12,0x48(%rsp)
   e74b7:	mov    0x20(%rsp),%rcx
   e74bc:	mov    0xc8(%rcx),%eax
   e74c2:	mov    %rax,%rdx
   e74c5:	shl    $0x18,%rdx
   e74c9:	mov    %r14,%r15
   e74cc:	or     %r14,%rdx
   e74cf:	mov    0x10(%rsp),%rdi
   e74d4:	mov    %rdi,(%rsi)
   e74d7:	mov    %rdx,0x8(%rsi)
   e74db:	mov    %rax,%rbx
   e74de:	inc    %eax
   e74e0:	mov    %eax,0xc8(%rcx)
   e74e6:	movzbl 0xcc(%rcx),%eax
   e74ed:	shrx   %rax,0x80(%rsp),%r12
   e74f7:	mov    0x68(%rcx),%rax
   e74fb:	movzbl (%rax,%r12,1),%esi
   e7500:	mov    %r12,%r14
   e7503:	shl    $0x6,%r14
   e7507:	add    0x50(%rcx),%r14
   e750b:	lea    0x1(%rsi),%rcx
   e750f:	shl    $0x4,%esi
   e7512:	mov    %rdi,(%rsi,%r14,1)
   e7516:	mov    %rdx,0x8(%rsi,%r14,1)
   e751b:	cmp    $0x4,%rcx
   e751f:	jne    e757b <sessions::fast::parse_events_avx2+0x8bdb>
   e7521:	movb   $0x0,(%rax,%r12,1)
   e7526:	mov    0x20(%rsp),%rcx
   e752b:	mov    0x8(%rcx),%rax
   e752f:	mov    0x20(%rcx),%rdx
   e7533:	mov    (%rax,%r12,8),%rcx
   e7537:	cmp    (%rdx,%r12,8),%rcx
   e753b:	je     e76b9 <sessions::fast::parse_events_avx2+0x8d19>
   e7541:	vmovaps (%r14),%xmm0
   e7546:	movntdq %xmm0,(%rcx)
   e754a:	lea    0x10(%rcx),%rdx
   e754e:	vmovaps 0x10(%r14),%xmm0
   e7554:	movntdq %xmm0,(%rdx)
   e7558:	lea    0x20(%rcx),%rdx
   e755c:	vmovaps 0x20(%r14),%xmm0
   e7562:	movntdq %xmm0,(%rdx)
   e7566:	add    $0x30,%rcx
   e756a:	vmovdqa 0x30(%r14),%xmm0
   e7570:	movntdq %xmm0,(%rcx)
   e7574:	addq   $0x40,(%rax,%r12,8)
   e7579:	jmp    e757f <sessions::fast::parse_events_avx2+0x8bdf>
   e757b:	mov    %cl,(%rax,%r12,1)
   e757f:	mov    0x20(%rsp),%rax
   e7584:	mov    0x80(%rax),%rax
   e758b:	cmp    $0xffffffffffffffff,%rax
   e758f:	je     e75d1 <sessions::fast::parse_events_avx2+0x8c31>
   e7591:	mov    0x20(%rsp),%rcx
   e7596:	mov    0x90(%rcx),%r14
   e759d:	cmp    %rax,%r14
   e75a0:	je     e7627 <sessions::fast::parse_events_avx2+0x8c87>
   e75a6:	mov    0x20(%rsp),%rdx
   e75ab:	mov    0x88(%rdx),%rax
   e75b2:	mov    %r14,%rcx
   e75b5:	shl    $0x4,%rcx
   e75b9:	mov    0x10(%rsp),%rsi
   e75be:	mov    %rsi,(%rax,%rcx,1)
   e75c2:	mov    %r15,0x8(%rax,%rcx,1)
   e75c7:	inc    %r14
   e75ca:	mov    %r14,0x90(%rdx)
   e75d1:	mov    0x20(%rsp),%rcx
   e75d6:	mov    0xbc(%rcx),%eax
   e75dc:	inc    %eax
   e75de:	mov    %eax,0xbc(%rcx)
   e75e4:	cmp    0xb8(%rcx),%eax
   e75ea:	jae    e76a7 <sessions::fast::parse_events_avx2+0x8d07>
   e75f0:	lea    0x110(%rsp),%r15
   e75f8:	vpbroadcastb -0xd683b(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e7601:	vpbroadcastb -0xd6843(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e760a:	vpbroadcastb -0xd684b(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e7613:	mov    0x48(%rsp),%r12
   e7618:	mov    0x58(%rsp),%r10
   e761d:	mov    0x70(%rsp),%r11
   e7622:	jmp    e6563 <sessions::fast::parse_events_avx2+0x7bc3>
   e7627:	mov    0x20(%rsp),%rax
   e762c:	lea    0x80(%rax),%rdi
   e7633:	vzeroupper
   e7636:	call   b2cd0 <<alloc::raw_vec::RawVec<[u64; 2]>>::grow_one>
   e763b:	jmp    e75a6 <sessions::fast::parse_events_avx2+0x8c06>
   e7640:	mov    0xc8(%rsp),%rsi
   e7648:	mov    %rbx,%rdx
   e764b:	mov    %r10,0x58(%rsp)
   e7650:	mov    %r12,0x48(%rsp)
   e7655:	mov    %r11,%r12
   e7658:	vzeroupper
   e765b:	call   b1b20 <<sessions::fast::sink::Sink<sessions::fast::ClickRec>>::refill>
   e7660:	mov    0x88(%rsp),%r8
   e7668:	mov    0x28(%rsp),%r9
   e766d:	mov    %r12,%r11
   e7670:	mov    0x48(%rsp),%r12
   e7675:	mov    0x58(%rsp),%r10
   e767a:	vpbroadcastb -0xd68bb(%rip),%ymm7        # 10dc8 <dummy_bucket.6+0x2a0>
   e7683:	vpbroadcastb -0xd68c5(%rip),%ymm6        # 10dc7 <dummy_bucket.6+0x29f>
   e768c:	vpbroadcastb -0xd68cf(%rip),%ymm5        # 10dc6 <dummy_bucket.6+0x29e>
   e7695:	mov    0x38(%rsp),%rax
   e769a:	mov    0x8(%rax),%rax
   e769e:	mov    (%rax,%rbx,8),%rcx
   e76a2:	jmp    e73e8 <sessions::fast::parse_events_avx2+0x8a48>
   e76a7:	mov    0x20(%rsp),%rdi
   e76ac:	vzeroupper
   e76af:	call   b0f90 <<sessions::fast::ids::Interner>::grow>
   e76b4:	jmp    e75f0 <sessions::fast::parse_events_avx2+0x8c50>
   e76b9:	mov    0x20(%rsp),%rdi
   e76be:	mov    0xc8(%rsp),%rsi
   e76c6:	mov    %r12,%rdx
   e76c9:	vzeroupper
   e76cc:	call   b1380 <<sessions::fast::sink::Sink<[u64; 2]>>::refill>
   e76d1:	mov    0x20(%rsp),%rax
   e76d6:	mov    0x8(%rax),%rax
   e76da:	mov    (%rax,%r12,8),%rcx
   e76de:	jmp    e7541 <sessions::fast::parse_events_avx2+0x8ba1>
   e76e3:	mov    $0x1,%edi
   e76e8:	mov    %rbx,%rsi
   e76eb:	call   103df3 <alloc::raw_vec::handle_error>
   e76f0:	lea    0x1992c1(%rip),%rdx        # 2809b8 <__init_array_end+0x1348>
   e76f7:	vzeroupper
   e76fa:	call   106a6b <core::panicking::panic_bounds_check>
   e76ff:	int3
