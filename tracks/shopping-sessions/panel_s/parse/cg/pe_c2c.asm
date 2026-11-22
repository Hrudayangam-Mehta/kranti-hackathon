
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/build_dbg/release/sessions:     file format elf64-x86-64


Disassembly of section .text:

00000000000a5fc0 <sessions::fast::parse_events_avx2>:
sessions::fast::parse_events_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/mod.rs:776
   a5fc0:	push   %rbp
   a5fc1:	push   %r15
   a5fc3:	push   %r14
   a5fc5:	push   %r13
   a5fc7:	push   %r12
   a5fc9:	push   %rbx
   a5fca:	sub    $0xd8,%rsp
   a5fd1:	mov    %rsi,%r15
sessions::fast::parse_events_k::<sessions::fast::scan::Avx2>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/mod.rs:847
   a5fd4:	mov    %rdi,0xb0(%rsp)
   a5fdc:	mov    %rcx,0xb8(%rsp)
   a5fe4:	mov    %r8,0xc0(%rsp)
   a5fec:	movq   $0x0,0xc8(%rsp)
   a5ff8:	xor    %eax,%eax
   a5ffa:	mov    %rdx,0x88(%rsp)
<core::slice::iter::Iter<u8> as core::iter::traits::iterator::Iterator>::rposition::<sessions::fast::scan::fused<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>::{closure#0}>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/slice/iter/macros.rs:405
   a6002:	mov    %rdx,%rcx
   a6005:	sub    $0xa0,%rcx
   a600c:	cmovae %rcx,%rax
   a6010:	inc    %rax
   a6013:	data16 data16 data16 cs nopw 0x0(%rax,%rax,1)
<core::ptr::non_null::NonNull<u8> as core::cmp::PartialEq>::eq:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/non_null.rs:1714
   a6020:	cmp    $0x1,%rax
<core::slice::iter::Iter<u8> as core::iter::traits::double_ended::DoubleEndedIterator>::next_back:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/slice/iter/macros.rs:25
   a6024:	je     a7e56 <sessions::fast::parse_events_avx2+0x1e96>
<core::slice::iter::Iter<u8> as core::iter::traits::iterator::Iterator>::rposition::<sessions::fast::scan::fused<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>::{closure#0}>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/slice/iter/macros.rs:407
   a602a:	lea    -0x1(%rax),%r12
sessions::fast::scan::fused::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>::{closure#0}:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:502
   a602e:	cmpb   $0xa,-0x2(%r15,%rax,1)
   a6034:	mov    %r12,%rax
<core::slice::iter::Iter<u8> as core::iter::traits::iterator::Iterator>::rposition::<sessions::fast::scan::fused<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>::{closure#0}>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/slice/iter/macros.rs:407
   a6037:	jne    a6020 <sessions::fast::parse_events_avx2+0x60>
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:436
   a6039:	test   %r12,%r12
   a603c:	je     a7e63 <sessions::fast::parse_events_avx2+0x1ea3>
   a6042:	vpbroadcastb -0x9c665(%rip),%ymm10        # 99e6 <__abi_tag+0x96ea>
   a604b:	vpbroadcastb -0x9c66d(%rip),%ymm11        # 99e7 <__abi_tag+0x96eb>
   a6054:	mov    $0xffffffffffffffff,%r14
   a605b:	vpbroadcastb -0x9c67c(%rip),%ymm12        # 99e8 <__abi_tag+0x96ec>
   a6064:	vmovdqa -0x9ce3c(%rip),%xmm13        # 9230 <__abi_tag+0x8f34>
   a606c:	vmovdqa -0x9d194(%rip),%xmm14        # 8ee0 <__abi_tag+0x8be4>
   a6074:	vmovdqa -0x9d61c(%rip),%xmm15        # 8a60 <__abi_tag+0x8764>
   a607c:	xor    %r11d,%r11d
   a607f:	mov    %r15,0x68(%rsp)
   a6084:	mov    %r12,0x60(%rsp)
   a6089:	jmp    a60b7 <sessions::fast::parse_events_avx2+0xf7>
<sessions::fast::sink::Sink<sessions::fast::EventRec>>::push:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/sink.rs:128
   a608b:	mov    %dl,(%rcx,%r14,1)
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
   a608f:	nop
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:494
   a6090:	mov    0xd0(%rsp),%eax
   a6097:	add    %rax,%r11
   a609a:	inc    %r11
   a609d:	mov    0x68(%rsp),%r15
   a60a2:	mov    0x60(%rsp),%r12
   a60a7:	mov    $0xffffffffffffffff,%r14
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:436
   a60ae:	cmp    %r12,%r11
   a60b1:	jae    a7e63 <sessions::fast::parse_events_avx2+0x1ea3>
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a60b7:	vmovdqu (%r15,%r11,1),%ymm3
   a60bd:	vmovdqu 0x20(%r15,%r11,1),%ymm2
   a60c4:	vmovdqu 0x40(%r15,%r11,1),%ymm1
   a60cb:	vmovdqu 0x60(%r15,%r11,1),%ymm0
sessions::fast::scan::masks_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:135
   a60d2:	vpcmpeqb %ymm2,%ymm10,%ymm6
   a60d6:	vpcmpeqb %ymm3,%ymm10,%ymm7
   a60da:	vpcmpeqb %ymm0,%ymm10,%ymm4
   a60de:	vpcmpeqb %ymm1,%ymm10,%ymm5
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:458
   a60e2:	vpor   %ymm6,%ymm4,%ymm8
   a60e6:	vpor   %ymm7,%ymm5,%ymm9
   a60ea:	vpor   %ymm8,%ymm9,%ymm8
   a60ef:	vpmovmskb %ymm8,%eax
   a60f4:	test   %eax,%eax
   a60f6:	je     a7289 <sessions::fast::parse_events_avx2+0x12c9>
   a60fc:	vpmovmskb %ymm7,%eax
   a6100:	vpmovmskb %ymm6,%ecx
   a6104:	shl    $0x20,%rcx
   a6108:	or     %rax,%rcx
   a610b:	vpmovmskb %ymm5,%eax
   a610f:	vpmovmskb %ymm4,%edx
   a6113:	shl    $0x20,%rdx
   a6117:	or     %rax,%rdx
<u64>::trailing_zeros:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:178
   a611a:	tzcnt  %rcx,%rax
   a611f:	tzcnt  %rdx,%r9
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:462
   a6124:	test   %rcx,%rcx
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:463
   a6127:	mov    $0x0,%edx
   a612c:	cmovne %edx,%r9d
   a6130:	add    %eax,%r9d
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:462
   a6133:	test   %rcx,%rcx
sessions::fast::scan::masks_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:134
   a6136:	vpcmpeqb %ymm3,%ymm11,%ymm4
   a613a:	vpmovmskb %ymm4,%edx
   a613e:	vpcmpeqb %ymm2,%ymm11,%ymm4
<u64>::wrapping_sub:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2621
   a6142:	shlx   %r9,%r14,%r8
   a6147:	not    %r8
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:465
   a614a:	mov    $0x0,%eax
   a614f:	cmove  %r8,%rax
sessions::fast::scan::masks_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:134
   a6153:	vpmovmskb %ymm4,%esi
   a6157:	shl    $0x20,%rsi
   a615b:	or     %rdx,%rsi
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:464
   a615e:	cmp    $0x1,%rcx
   a6162:	mov    $0x0,%edi
   a6167:	sbb    %rdi,%rdi
   a616a:	or     %r8,%rdi
sessions::fast::scan::masks_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:134
   a616d:	vpcmpeqb %ymm1,%ymm11,%ymm4
   a6171:	vpmovmskb %ymm4,%edx
   a6175:	vpcmpeqb %ymm0,%ymm11,%ymm4
   a6179:	vpmovmskb %ymm4,%ecx
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:466
   a617d:	and    %rdi,%rsi
sessions::fast::scan::masks_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:134
   a6180:	shl    $0x20,%rcx
   a6184:	or     %rdx,%rcx
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:466
   a6187:	and    %rax,%rcx
<u64>::count_ones:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:85
   a618a:	popcnt %rsi,%rdx
   a618f:	popcnt %rcx,%r8
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:480
   a6194:	add    %edx,%r8d
   a6197:	cmp    $0x6,%r8d
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:481
   a619b:	jne    a72a4 <sessions::fast::parse_events_avx2+0x12e4>
   a61a1:	blsr   %rsi,%rdx
   a61a6:	blsr   %rdx,%rdx
   a61ab:	tzcnt  %rdx,%rbx
   a61b0:	cmp    $0x3f,%ebx
   a61b3:	ja     a72a4 <sessions::fast::parse_events_avx2+0x12e4>
   a61b9:	cmp    %ebx,%r9d
   a61bc:	jbe    a72a4 <sessions::fast::parse_events_avx2+0x12e4>
   a61c2:	lea    0x1(%rbx),%ebp
   a61c5:	mov    %r9d,%r8d
   a61c8:	sub    %ebp,%r8d
   a61cb:	cmp    $0x40,%r8d
   a61cf:	jae    a72a4 <sessions::fast::parse_events_avx2+0x12e4>
   a61d5:	mov    %r9,0xd0(%rsp)
   a61dd:	mov    %ebx,%r9d
   a61e0:	and    $0x3f,%r9d
   a61e4:	mov    $0x1,%edx
   a61e9:	shlx   %r9,%rdx,%rdx
   a61ee:	mov    %r8,0xa8(%rsp)
   a61f6:	bzhi   %r9,%r14,%r8
   a61fb:	bzhi   %r9,%rsi,%r14
   a6200:	shrx   %r9,%rsi,%rsi
   a6205:	shr    $1,%rsi
sessions::fast::scan::masks_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:136
   a6208:	vpcmpeqb %ymm3,%ymm12,%ymm3
   a620c:	vpmovmskb %ymm3,%r10d
   a6210:	vpcmpeqb %ymm2,%ymm12,%ymm2
   a6214:	mov    %r11,(%rsp)
   a6218:	vpmovmskb %ymm2,%r11d
   a621c:	shl    $0x20,%r11
   a6220:	or     %r10,%r11
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:467
   a6223:	and    %r11,%rdi
   a6226:	mov    (%rsp),%r11
<u64>::unchecked_shr:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2228
   a622a:	shrx   %r9,%rdi,%r10
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
   a622f:	xor    $0x3f,%r9
   a6233:	shlx   %r9,%rcx,%r12
   a6238:	or     %rsi,%r12
sessions::fast::scan::masks_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:136
   a623b:	vpcmpeqb %ymm1,%ymm12,%ymm1
   a623f:	vpmovmskb %ymm1,%ecx
   a6243:	vpcmpeqb %ymm0,%ymm12,%ymm0
   a6247:	vpmovmskb %ymm0,%esi
   a624b:	shl    $0x20,%rsi
   a624f:	or     %rcx,%rsi
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:467
   a6252:	and    %rsi,%rax
<u64>::unchecked_shr:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2228
   a6255:	shr    $1,%r10
<u64>::unchecked_shl:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2043
   a6258:	shlx   %r9,%rax,%r13
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>::{closure#0}:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:476
   a625d:	or     %r10,%r13
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:485
   a6260:	or     %r14,%rdx
   a6263:	and    %r8,%rdi
   a6266:	mov    %r14,%r8
sessions::fast::scan::quotes:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:380
   a6269:	lea    0x1(,%r14,2),%r15
   a6271:	and    %rdi,%r15
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:382
   a6274:	mov    %rdx,%rax
   a6277:	shr    $1,%rax
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:381
   a627a:	andn   %rax,%rdx,%rax
<u64>::wrapping_sub:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2621
   a627f:	sub    %r15,%rdx
sessions::fast::scan::quotes:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:382
   a6282:	and    %rdx,%rax
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:383
   a6285:	mov    %rax,%rcx
   a6288:	or     %r15,%rcx
   a628b:	xor    %rdi,%rcx
   a628e:	and    %r15,%rax
   a6291:	or     %rcx,%rax
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:486
   a6294:	mov    %r12,%rcx
   a6297:	mov    0xa8(%rsp),%rdx
   a629f:	bts    %rdx,%rcx
sessions::fast::scan::quotes:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:380
   a62a3:	lea    0x1(,%r12,2),%r14
   a62ab:	and    %r13,%r14
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:382
   a62ae:	mov    %rcx,%rdx
   a62b1:	shr    $1,%rdx
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:381
   a62b4:	andn   %rdx,%rcx,%rdx
<u64>::wrapping_sub:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2621
   a62b9:	sub    %r14,%rcx
sessions::fast::scan::quotes:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:382
   a62bc:	and    %rcx,%rdx
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:383
   a62bf:	mov    %rdx,%rcx
   a62c2:	or     %r14,%rcx
   a62c5:	xor    %r13,%rcx
   a62c8:	and    %r14,%rdx
   a62cb:	or     %rax,%rdx
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:487
   a62ce:	or     %rcx,%rdx
   a62d1:	jne    a6090 <sessions::fast::parse_events_avx2+0xd0>
sessions::fast::scan::take:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:392
   a62d7:	tzcnt  %r8,%rdx
<u32>::wrapping_sub:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2621
   a62dc:	lea    (%rdi,%rdi,1),%ecx
   a62df:	and    $0x2,%ecx
   a62e2:	mov    %rdx,%rax
   a62e5:	sub    %rcx,%rax
<sessions::fast::EventLines<sessions::fast::scan::Avx2> as sessions::fast::scan::Lines<7>>::line:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/mod.rs:793
   a62e8:	mov    %rax,%rsi
   a62eb:	mov    $0xffffffff,%ecx
   a62f0:	and    %rcx,%rsi
   a62f3:	je     a6090 <sessions::fast::parse_events_avx2+0xd0>
   a62f9:	mov    %r8,0x8(%rsp)
   a62fe:	mov    0x68(%rsp),%rcx
   a6303:	add    %r11,%rcx
   a6306:	and    $0x1,%edi
   a6309:	mov    0xb0(%rsp),%r9
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/mod.rs:796
   a6311:	incq   0xc8(%rsp)
sessions::fast::scan::pack_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:146
   a6319:	cmp    $0xa,%esi
   a631c:	mov    %rcx,0x90(%rsp)
   a6324:	ja     a6975 <sessions::fast::parse_events_avx2+0x9b5>
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a632a:	vmovdqu (%rcx,%rdi,1),%xmm1
<core::core_arch::simd::Simd<i8, 16>>::splat:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/simd.rs:57
   a632f:	vmovd  %eax,%xmm0
   a6333:	vpbroadcastb %xmm0,%xmm0
core::core_arch::x86::sse2::_mm_cmpgt_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:950
   a6338:	vpcmpgtb %xmm13,%xmm0,%xmm0
core::core_arch::x86::sse2::_mm_sub_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:381
   a633d:	vpaddb %xmm1,%xmm14,%xmm2
core::core_arch::x86::sse2::_mm_cmpeq_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:914
   a6341:	vpminub %xmm2,%xmm15,%xmm3
   a6345:	vpcmpeqb %xmm3,%xmm2,%xmm2
core::core_arch::x86::sse2::_mm_sub_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:381
   a6349:	vpaddb -0x9d5a1(%rip),%xmm1,%xmm3        # 8db0 <__abi_tag+0x8ab4>
   a6351:	vmovdqa -0x9ddf9(%rip),%xmm5        # 8560 <__abi_tag+0x8264>
core::core_arch::x86::sse2::_mm_cmpeq_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:914
   a6359:	vpminub %xmm5,%xmm3,%xmm4
   a635d:	vpcmpeqb %xmm4,%xmm3,%xmm3
core::core_arch::x86::sse2::_mm_sub_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:381
   a6361:	vpaddb -0x9e0f9(%rip),%xmm1,%xmm4        # 8270 <__abi_tag+0x7f74>
core::core_arch::x86::sse2::_mm_cmpeq_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:914
   a6369:	vpminub %xmm5,%xmm4,%xmm5
   a636d:	vpcmpeqb %xmm5,%xmm4,%xmm5
   a6371:	vpcmpeqb -0x9d849(%rip),%xmm1,%xmm4        # 8b30 <__abi_tag+0x8834>
core::core_arch::x86::sse2::_mm_or_si128:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:889
   a6379:	vpor   %xmm2,%xmm3,%xmm6
   a637d:	vpor   %xmm5,%xmm4,%xmm7
   a6381:	vpor   %xmm6,%xmm7,%xmm6
core::core_arch::x86::sse2::_mm_andnot_si128:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:876
   a6385:	vpandn %xmm0,%xmm6,%xmm6
core::core_arch::x86::sse2::_mm_movemask_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:1615
   a6389:	vpmovmskb %xmm6,%eax
sessions::fast::scan::pack_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:172
   a638d:	test   %eax,%eax
   a638f:	jne    a6975 <sessions::fast::parse_events_avx2+0x9b5>
core::core_arch::x86::sse2::_mm_add_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:81
   a6395:	vpaddb -0x9e22d(%rip),%xmm1,%xmm6        # 8170 <__abi_tag+0x7e74>
core::core_arch::x86::sse2::_mm_and_si128:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:863
   a639d:	vpand  %xmm6,%xmm5,%xmm5
core::core_arch::x86::sse2::_mm_add_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:81
   a63a1:	vpaddb -0x9d229(%rip),%xmm1,%xmm6        # 9180 <__abi_tag+0x8e84>
core::core_arch::x86::sse2::_mm_and_si128:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:863
   a63a9:	vpand  %xmm6,%xmm3,%xmm3
core::core_arch::x86::sse2::_mm_add_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:81
   a63ad:	vpaddb -0x9dcc5(%rip),%xmm1,%xmm1        # 86f0 <__abi_tag+0x83f4>
core::core_arch::x86::sse2::_mm_and_si128:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:863
   a63b5:	vpand  %xmm1,%xmm2,%xmm1
core::core_arch::x86::ssse3::_mm_maddubs_epi16:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/ssse3.rs:289
   a63b9:	vpor   %xmm3,%xmm1,%xmm1
   a63bd:	vpand  -0x9d885(%rip),%xmm4,%xmm2        # 8b40 <__abi_tag+0x8844>
core::core_arch::x86::sse2::_mm_or_si128:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:889
   a63c5:	vpor   %xmm2,%xmm5,%xmm2
core::core_arch::x86::ssse3::_mm_maddubs_epi16:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/ssse3.rs:289
   a63c9:	vpor   %xmm1,%xmm2,%xmm1
   a63cd:	vpand  %xmm1,%xmm0,%xmm0
   a63d1:	vpmaddubsw -0x9e25a(%rip),%xmm0,%xmm0        # 8180 <__abi_tag+0x7e84>
core::core_arch::x86::sse2::_mm_madd_epi16:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:226
   a63da:	vpmaddwd -0x9d892(%rip),%xmm0,%xmm0        # 8b50 <__abi_tag+0x8854>
core::core_arch::x86::sse41::_mm_extract_epi32::<1>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/macros.rs:189
   a63e2:	vpextrd $0x1,%xmm0,%eax
core::core_arch::x86::sse2::_mm_cvtsi128_si32:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/macros.rs:188
   a63e8:	vmovd  %xmm0,%ecx
core::core_arch::x86::sse41::_mm_extract_epi32::<2>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/macros.rs:189
   a63ec:	vpextrd $0x2,%xmm0,%r10d
sessions::fast::scan::pack_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:181
   a63f2:	shl    $0x24,%rcx
   a63f6:	shl    $0xc,%rax
   a63fa:	or     %rcx,%rax
   a63fd:	shr    $0xc,%r10d
   a6401:	or     %rax,%r10
<sessions::fast::EventLines<sessions::fast::scan::Avx2> as sessions::fast::scan::Lines<7>>::line:
   a6404:	tzcnt  %r12,%rsi
   a6409:	lea    0x0(,%r13,2),%eax
   a6411:	and    $0x2,%eax
   a6414:	mov    %rsi,%rcx
   a6417:	mov    $0xffffffff,%r8d
   a641d:	sub    %rax,%rcx
   a6420:	mov    %rcx,%rax
<sessions::fast::ts::Calendar>::parse:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:156
   a6423:	je     a6809 <sessions::fast::parse_events_avx2+0x849>
   a6429:	mov    %ebp,%edi
   a642b:	add    0x90(%rsp),%rdi
   a6433:	and    $0x1,%r13d
   a6437:	add    %rdi,%r13
   a643a:	mov    %eax,%ecx
   a643c:	cmp    $0x19,%eax
   a643f:	je     a65c9 <sessions::fast::parse_events_avx2+0x609>
   a6445:	cmp    $0x14,%eax
   a6448:	jne    a6827 <sessions::fast::parse_events_avx2+0x867>
   a644e:	cmpb   $0x5a,0x13(%r13)
   a6453:	jne    a681e <sessions::fast::parse_events_avx2+0x85e>
   a6459:	mov    %rdx,0x30(%rsp)
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a645e:	mov    0x0(%r13),%rdx
   a6462:	mov    0x910(%r9),%rax
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a6469:	imul   %rdx,%rax
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:126
   a646d:	shr    $0x3c,%rax
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:127
   a6471:	cmp    %rdx,0x6c8(%r9,%rax,8)
   a6479:	mov    %r9,0x10(%rsp)
   a647e:	mov    %rdi,0x40(%rsp)
   a6483:	mov    %rsi,0x18(%rsp)
   a6488:	mov    %r10,%rbp
   a648b:	jne    a7b16 <sessions::fast::parse_events_avx2+0x1b56>
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:128
   a6491:	mov    0x748(%r9,%rax,8),%rcx
   a6499:	mov    0x7c8(%r9,%rax,8),%rdx
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a64a1:	movzwl 0x8(%r13),%esi
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:132
   a64a6:	xor    $0x3030,%rsi
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a64ad:	mov    0xb(%r13),%rdi
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:134
   a64b1:	mov    %rdi,%rax
   a64b4:	movabs $0x3030303030303030,%r8
   a64be:	xor    %r8,%rax
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a64c1:	lea    0x7676(%rsi),%r8d
sessions::fast::ts::digit_fault:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:187
   a64c8:	or     %esi,%r8d
   a64cb:	and    $0x8080,%r8d
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a64d2:	movabs $0x7676767676767676,%r9
   a64dc:	add    %rax,%r9
sessions::fast::ts::digit_fault:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:187
   a64df:	or     %rdi,%r9
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:137
   a64e2:	movabs $0x8080008080008080,%r10
   a64ec:	and    %r10,%r9
   a64ef:	xor    %r10d,%r10d
   a64f2:	cmpb   $0x54,0xa(%r13)
   a64f7:	setne  %r10b
   a64fb:	movabs $0xff0000ff0000,%r11
   a6505:	and    %r11,%rdi
   a6508:	or     %r10,%rdi
   a650b:	or     %r9,%rdi
   a650e:	or     %r8,%rdi
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:138
   a6511:	movabs $0x3a00003a0000,%r8
   a651b:	cmp    %r8,%rdi
   a651e:	jne    a6aa4 <sessions::fast::parse_events_avx2+0xae4>
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a6524:	lea    (%rax,%rax,4),%rdi
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:142
   a6528:	shr    $0x8,%rax
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a652c:	lea    (%rax,%rdi,2),%r9
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:145
   a6530:	mov    %r9,%rax
   a6533:	shr    $0x30,%rax
   a6537:	movzbl %al,%edi
   a653a:	xor    %eax,%eax
   a653c:	cmp    $0x3b,%rdi
   a6540:	mov    (%rsp),%r11
   a6544:	mov    %rbp,%r10
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:146
   a6547:	ja     a6ae6 <sessions::fast::parse_events_avx2+0xb26>
   a654d:	mov    %r9d,%r8d
   a6550:	shr    $0x18,%r8d
   a6554:	cmp    $0x3b,%r8d
   a6558:	ja     a6ae6 <sessions::fast::parse_events_avx2+0xb26>
   a655e:	movzbl %r9b,%r9d
   a6562:	cmp    $0x17,%r9d
   a6566:	ja     a6ae6 <sessions::fast::parse_events_avx2+0xb26>
   a656c:	mov    %r10,%r13
   a656f:	movzbl %sil,%r10d
   a6573:	lea    (%r10,%r10,4),%r10
   a6577:	shr    $0x8,%esi
   a657a:	lea    (%rsi,%r10,2),%rsi
   a657e:	test   %rsi,%rsi
   a6581:	je     a7301 <sessions::fast::parse_events_avx2+0x1341>
   a6587:	cmp    %rdx,%rsi
   a658a:	mov    %r13,%r10
   a658d:	jg     a6ae6 <sessions::fast::parse_events_avx2+0xb26>
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:149
   a6593:	add    %rcx,%rsi
   a6596:	imul   $0x15180,%rsi,%rax
   a659d:	imul   $0xe10,%r9,%rcx
   a65a4:	imul   $0x3c,%r8,%rdx
   a65a8:	add    %rdi,%rcx
   a65ab:	add    %rdx,%rcx
   a65ae:	add    %rax,%rcx
   a65b1:	imul   $0x3e8,%rcx,%rbp
   a65b8:	add    $0xfffffffffad9a400,%rbp
   a65bf:	mov    0x10(%rsp),%r9
   a65c4:	jmp    a6b86 <sessions::fast::parse_events_avx2+0xbc6>
<sessions::fast::ts::Calendar>::parse:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:159
   a65c9:	movzbl 0x13(%r13),%ebp
   a65ce:	cmp    $0x2b,%ebp
   a65d1:	je     a65dc <sessions::fast::parse_events_avx2+0x61c>
   a65d3:	cmp    $0x2d,%ebp
   a65d6:	jne    a681e <sessions::fast::parse_events_avx2+0x85e>
   a65dc:	mov    %ebp,0x20(%rsp)
   a65e0:	mov    %rsi,0x18(%rsp)
   a65e5:	mov    %rdx,0x30(%rsp)
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a65ea:	mov    0x0(%r13),%rdx
   a65ee:	mov    0x910(%r9),%rax
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a65f5:	imul   %rdx,%rax
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:126
   a65f9:	shr    $0x3c,%rax
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:127
   a65fd:	cmp    %rdx,0x6c8(%r9,%rax,8)
   a6605:	mov    %r9,0x10(%rsp)
   a660a:	mov    %rdi,0x40(%rsp)
   a660f:	mov    %r10,%rbp
   a6612:	jne    a7aac <sessions::fast::parse_events_avx2+0x1aec>
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:128
   a6618:	mov    0x748(%r9,%rax,8),%rcx
   a6620:	mov    %rcx,0x28(%rsp)
   a6625:	mov    0x7c8(%r9,%rax,8),%rsi
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a662d:	movzwl 0x8(%r13),%r9d
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:132
   a6632:	xor    $0x3030,%r9
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a6639:	mov    0xb(%r13),%rcx
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:134
   a663d:	mov    %rcx,%rax
   a6640:	movabs $0x3030303030303030,%rdx
   a664a:	xor    %rdx,%rax
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a664d:	lea    0x7676(%r9),%edx
sessions::fast::ts::digit_fault:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:187
   a6654:	or     %r9d,%edx
   a6657:	and    $0x8080,%edx
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a665d:	movabs $0x7676767676767676,%rdi
   a6667:	add    %rax,%rdi
sessions::fast::ts::digit_fault:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:187
   a666a:	or     %rcx,%rdi
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:137
   a666d:	movabs $0x8080008080008080,%r8
   a6677:	and    %r8,%rdi
   a667a:	xor    %r8d,%r8d
   a667d:	cmpb   $0x54,0xa(%r13)
   a6682:	setne  %r8b
   a6686:	movabs $0xff0000ff0000,%r10
   a6690:	and    %r10,%rcx
   a6693:	or     %r8,%rcx
   a6696:	or     %rdi,%rcx
   a6699:	or     %rdx,%rcx
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:138
   a669c:	movabs $0x3a00003a0000,%rdx
   a66a6:	cmp    %rdx,%rcx
   a66a9:	jne    a6a93 <sessions::fast::parse_events_avx2+0xad3>
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a66af:	lea    (%rax,%rax,4),%rcx
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:142
   a66b3:	shr    $0x8,%rax
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a66b7:	lea    (%rax,%rcx,2),%rcx
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:145
   a66bb:	mov    %rcx,%rax
   a66be:	shr    $0x30,%rax
   a66c2:	movzbl %al,%edx
   a66c5:	xor    %eax,%eax
   a66c7:	cmp    $0x3b,%rdx
   a66cb:	mov    %rbp,%r10
   a66ce:	mov    $0xffffffff,%r8d
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:146
   a66d4:	ja     a6acd <sessions::fast::parse_events_avx2+0xb0d>
   a66da:	mov    %ecx,%edi
   a66dc:	shr    $0x18,%edi
   a66df:	cmp    $0x3b,%edi
   a66e2:	ja     a6acd <sessions::fast::parse_events_avx2+0xb0d>
   a66e8:	movzbl %cl,%r8d
   a66ec:	cmp    $0x17,%r8d
   a66f0:	ja     a6ae6 <sessions::fast::parse_events_avx2+0xb26>
   a66f6:	movzbl %r9b,%ecx
   a66fa:	lea    (%rcx,%rcx,4),%rcx
   a66fe:	shr    $0x8,%r9d
   a6702:	lea    (%r9,%rcx,2),%r9
   a6706:	test   %r9,%r9
   a6709:	je     a6ae6 <sessions::fast::parse_events_avx2+0xb26>
   a670f:	cmp    %rsi,%r9
   a6712:	jg     a6ae6 <sessions::fast::parse_events_avx2+0xb26>
<sessions::fast::ts::Calendar>::parse:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:165
   a6718:	cmpb   $0x3a,0x16(%r13)
   a671d:	jne    a6ae4 <sessions::fast::parse_events_avx2+0xb24>
   a6723:	movzbl 0x14(%r13),%esi
   a6728:	add    $0xd0,%sil
   a672c:	xor    %eax,%eax
   a672e:	cmp    $0x9,%sil
   a6732:	ja     a6ae6 <sessions::fast::parse_events_avx2+0xb26>
   a6738:	movzbl 0x15(%r13),%r11d
   a673d:	add    $0xd0,%r11b
   a6741:	cmp    $0x9,%r11b
   a6745:	ja     a7273 <sessions::fast::parse_events_avx2+0x12b3>
   a674b:	movzbl 0x17(%r13),%ecx
   a6750:	add    $0xd0,%cl
   a6753:	cmp    $0x9,%cl
   a6756:	ja     a7273 <sessions::fast::parse_events_avx2+0x12b3>
   a675c:	mov    %r10,%rbp
   a675f:	movzbl 0x18(%r13),%r10d
   a6764:	add    $0xd0,%r10b
   a6768:	cmp    $0x9,%r10b
   a676c:	ja     a6aa6 <sessions::fast::parse_events_avx2+0xae6>
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:168
   a6772:	movzbl %sil,%eax
   a6776:	add    %eax,%eax
   a6778:	lea    (%rax,%rax,4),%esi
   a677b:	add    %r11b,%sil
   a677e:	xor    %eax,%eax
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:170
   a6780:	cmp    $0x17,%sil
   a6784:	ja     a6aa6 <sessions::fast::parse_events_avx2+0xae6>
   a678a:	movzbl %cl,%ecx
   a678d:	add    %ecx,%ecx
   a678f:	lea    (%rcx,%rcx,4),%ecx
   a6792:	add    %r10b,%cl
   a6795:	cmp    $0x3b,%cl
   a6798:	mov    (%rsp),%r11
   a679c:	ja     a6a95 <sessions::fast::parse_events_avx2+0xad5>
   a67a2:	add    0x28(%rsp),%r9
   a67a7:	imul   $0x15180,%r9,%rax
   a67ae:	imul   $0xe10,%r8,%r8
   a67b5:	imul   $0x3c,%rdi,%rdi
   a67b9:	add    %rdx,%r8
   a67bc:	add    %rdi,%r8
   a67bf:	add    %rax,%r8
   a67c2:	imul   $0x3e8,%r8,%rax
   a67c9:	add    $0xfffffffffad9a400,%rax
<i64 as core::convert::From<u8>>::from:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/convert/num.rs:82
   a67cf:	movzbl %cl,%ecx
   a67d2:	movzbl %sil,%edx
<sessions::fast::ts::Calendar>::parse:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:173
   a67d6:	imul   $0x36ee80,%rdx,%rdx
   a67dd:	imul   $0xea60,%rcx,%rcx
   a67e4:	add    %rdx,%rcx
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:174
   a67e7:	mov    %rcx,%rdx
   a67ea:	neg    %rdx
   a67ed:	cmpb   $0x2b,0x20(%rsp)
   a67f2:	cmovne %rcx,%rdx
   a67f6:	add    %rax,%rdx
   a67f9:	mov    0x10(%rsp),%r9
   a67fe:	mov    %rbp,%r10
   a6801:	mov    %rdx,%rbp
   a6804:	jmp    a6b86 <sessions::fast::parse_events_avx2+0xbc6>
   a6809:	mov    %rax,%r15
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:156
   a680c:	mov    %r15d,%eax
   a680f:	movabs $0x7fffffffffffffff,%rbp
   a6819:	jmp    a75a0 <sessions::fast::parse_events_avx2+0x15e0>
<usize as core::cmp::PartialOrd>::le:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/cmp.rs:1918
   a681e:	test   %rcx,%rcx
<core::ops::range::RangeInclusive<usize> as core::ops::range::RangeBounds<usize>>::contains::<usize>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ops/range.rs:873
   a6821:	je     a6961 <sessions::fast::parse_events_avx2+0x9a1>
<usize as core::cmp::PartialOrd>::le:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/cmp.rs:1918
   a6827:	cmp    $0x11,%ecx
   a682a:	mov    %rdx,0x30(%rsp)
   a682f:	mov    %rsi,0x18(%rsp)
<sessions::fast::ts::Calendar>::parse:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:176
   a6834:	jae    a68ec <sessions::fast::parse_events_avx2+0x92c>
sessions::fast::ts::digits_padded:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:211
   a683a:	cmp    $0x9,%ecx
   a683d:	jae    a69ed <sessions::fast::parse_events_avx2+0xa2d>
sessions::fast::ts::head:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:206
   a6843:	lea    0x0(,%rcx,8),%edx
   a684a:	mov    %rax,%rbp
   a684d:	xor    %eax,%eax
<u64>::checked_shr:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2162
   a684f:	cmp    $0x8,%rcx
   a6853:	movabs $0x3030303030303030,%rsi
   a685d:	shrx   %rdx,%rsi,%rcx
   a6862:	cmove  %rax,%rcx
sessions::fast::ts::head:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:206
   a6866:	neg    %bpl
   a6869:	shl    $0x3,%bpl
   a686d:	shlx   %rbp,0x0(%r13),%rdx
   a6873:	or     %rdx,%rcx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:192
   a6876:	xor    %rsi,%rcx
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a6879:	movabs $0x7676767676767676,%rsi
   a6883:	add    %rcx,%rsi
sessions::fast::ts::digit_fault:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:187
   a6886:	or     %rdx,%rsi
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:193
   a6889:	movabs $0x8080808080808080,%rdx
   a6893:	test   %rdx,%rsi
   a6896:	jne    a6963 <sessions::fast::parse_events_avx2+0x9a3>
   a689c:	mov    %rdi,0x40(%rsp)
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a68a1:	lea    (%rcx,%rcx,4),%rax
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:196
   a68a5:	shr    $0x8,%rcx
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a68a9:	lea    (%rcx,%rax,2),%rbp
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a68ad:	mov    %rbp,%rax
   a68b0:	movabs $0xff000000ff,%rcx
   a68ba:	and    %rcx,%rax
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a68bd:	movabs $0xf424000000064,%rdx
   a68c7:	imul   %rdx,%rax
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a68cb:	shr    $0x10,%rbp
   a68cf:	and    %rcx,%rbp
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a68d2:	movabs $0x271000000001,%rcx
   a68dc:	imul   %rcx,%rbp
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a68e0:	add    %rax,%rbp
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a68e3:	shr    $0x20,%rbp
<core::option::Option<u64>>::map::<i64, sessions::fast::ts::digits_padded::{closure#0}>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/option.rs:1165
   a68e7:	jmp    a6b8c <sessions::fast::parse_events_avx2+0xbcc>
<sessions::fast::ts::Calendar>::parse:
   a68ec:	mov    %rdi,0x40(%rsp)
   a68f1:	xor    %edx,%edx
   a68f3:	xor    %eax,%eax
   a68f5:	xor    %esi,%esi
   a68f7:	xor    %ebp,%ebp
   a68f9:	nopl   0x0(%rax)
sessions::fast::ts::epoch:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:226
   a6900:	movzbl 0x0(%r13,%rdx,1),%edi
<u8>::wrapping_sub:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2621
   a6906:	add    $0xd0,%dil
sessions::fast::ts::epoch:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:228
   a690a:	cmp    $0x9,%dil
   a690e:	ja     a69d3 <sessions::fast::parse_events_avx2+0xa13>
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:231
   a6914:	test   %dil,%dil
   a6917:	setne  %r8b
   a691b:	or     %r8b,%sil
<u32 as core::convert::From<bool>>::from:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/convert/num.rs:61
   a691e:	movzbl %sil,%r8d
   a6922:	and    $0x1,%r8d
sessions::fast::ts::epoch:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:232
   a6926:	add    %r8d,%eax
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a6929:	lea    0x0(,%rbp,4),%r8
   a6931:	add    %rbp,%r8
<u64 as core::convert::From<u8>>::from:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/convert/num.rs:82
   a6934:	movzbl %dil,%edi
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a6938:	lea    (%rdi,%r8,2),%rbp
<core::ptr::non_null::NonNull<u8> as core::cmp::PartialEq>::eq:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/non_null.rs:1714
   a693c:	inc    %rdx
   a693f:	cmp    %rdx,%rcx
<core::slice::iter::Iter<u8> as core::iter::traits::iterator::Iterator>::next:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/slice/iter/macros.rs:180
   a6942:	jne    a6900 <sessions::fast::parse_events_avx2+0x940>
sessions::fast::ts::epoch:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:235
   a6944:	cmp    $0x14,%eax
   a6947:	setb   %al
   a694a:	test   %rbp,%rbp
   a694d:	setns  %cl
   a6950:	and    %al,%cl
<core::option::Option<i64>>::unwrap_or:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/option.rs:1039
   a6952:	cmp    $0x1,%cl
   a6955:	mov    $0xffffffff,%r8d
   a695b:	je     a6b8c <sessions::fast::parse_events_avx2+0xbcc>
<sessions::fast::EventLines<sessions::fast::scan::Avx2> as sessions::fast::scan::Lines<7>>::line:
   a6961:	xor    %eax,%eax
   a6963:	movabs $0x7fffffffffffffff,%rbp
   a696d:	xor    %r15d,%r15d
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:193
   a6970:	jmp    a75a0 <sessions::fast::parse_events_avx2+0x15e0>
sessions::fast::intern_k::<sessions::fast::scan::Avx2>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/mod.rs:596
   a6975:	add    %rcx,%rdi
   a6978:	mov    %r9,0x10(%rsp)
   a697d:	mov    %rdx,0x30(%rsp)
   a6982:	vzeroupper
   a6985:	call   b5670 <sessions::fast::keys::intern_exotic>
   a698a:	mov    0x30(%rsp),%rdx
   a698f:	mov    0x10(%rsp),%r9
   a6994:	mov    (%rsp),%r11
   a6998:	vmovdqa -0x9df40(%rip),%xmm15        # 8a60 <__abi_tag+0x8764>
   a69a0:	vmovdqa -0x9dac8(%rip),%xmm14        # 8ee0 <__abi_tag+0x8be4>
   a69a8:	vmovdqa -0x9d780(%rip),%xmm13        # 9230 <__abi_tag+0x8f34>
   a69b0:	vpbroadcastb -0x9cfd1(%rip),%ymm12        # 99e8 <__abi_tag+0x96ec>
   a69b9:	vpbroadcastb -0x9cfdb(%rip),%ymm11        # 99e7 <__abi_tag+0x96eb>
   a69c2:	vpbroadcastb -0x9cfe5(%rip),%ymm10        # 99e6 <__abi_tag+0x96ea>
   a69cb:	mov    %rax,%r10
   a69ce:	jmp    a6404 <sessions::fast::parse_events_avx2+0x444>
<sessions::fast::EventLines<sessions::fast::scan::Avx2> as sessions::fast::scan::Lines<7>>::line:
   a69d3:	xor    %eax,%eax
   a69d5:	movabs $0x7fffffffffffffff,%rbp
   a69df:	mov    $0xffffffff,%r8d
   a69e5:	xor    %r15d,%r15d
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:193
   a69e8:	jmp    a75a0 <sessions::fast::parse_events_avx2+0x15e0>
sessions::fast::ts::digits_padded:
   a69ed:	mov    %rdi,0x40(%rsp)
   a69f2:	mov    %r10,0x20(%rsp)
   a69f7:	mov    %r9,%rbp
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:214
   a69fa:	lea    -0x8(%rcx),%rdx
sessions::fast::ts::head:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:206
   a69fe:	lea    0x0(,%rdx,8),%esi
   a6a05:	xor    %eax,%eax
<u64>::checked_shr:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2162
   a6a07:	cmp    $0x10,%rcx
   a6a0b:	movabs $0x3030303030303030,%r10
   a6a15:	shrx   %rsi,%r10,%rcx
   a6a1a:	cmove  %rax,%rcx
sessions::fast::ts::head:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:206
   a6a1e:	mov    %edx,%esi
   a6a20:	neg    %sil
   a6a23:	shl    $0x3,%sil
   a6a27:	shlx   %rsi,0x0(%r13),%rsi
   a6a2d:	or     %rsi,%rcx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:192
   a6a30:	xor    %r10,%rcx
   a6a33:	movabs $0x7676767676767676,%r9
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a6a3d:	lea    (%rcx,%r9,1),%rdi
sessions::fast::ts::digit_fault:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:187
   a6a41:	or     %rsi,%rdi
   a6a44:	movabs $0x8080808080808080,%r8
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:193
   a6a4e:	test   %r8,%rdi
   a6a51:	jne    a6a70 <sessions::fast::parse_events_avx2+0xab0>
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a6a53:	mov    0x0(%r13,%rdx,1),%rax
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:192
   a6a58:	mov    %rax,%rdx
   a6a5b:	xor    %r10,%rdx
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a6a5e:	lea    (%rdx,%r9,1),%rsi
sessions::fast::ts::digit_fault:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:187
   a6a62:	or     %rax,%rsi
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:193
   a6a65:	test   %r8,%rsi
   a6a68:	je     a6b03 <sessions::fast::parse_events_avx2+0xb43>
sessions::fast::ts::digits_padded:
   a6a6e:	xor    %eax,%eax
   a6a70:	movabs $0x7fffffffffffffff,%rcx
   a6a7a:	xor    %r15d,%r15d
   a6a7d:	mov    %rbp,%r9
   a6a80:	mov    %rcx,%rbp
   a6a83:	mov    0x20(%rsp),%r10
   a6a88:	mov    $0xffffffff,%r8d
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:193
   a6a8e:	jmp    a75a0 <sessions::fast::parse_events_avx2+0x15e0>
   a6a93:	xor    %eax,%eax
   a6a95:	movabs $0x7fffffffffffffff,%rcx
   a6a9f:	xor    %r15d,%r15d
   a6aa2:	jmp    a6ab7 <sessions::fast::parse_events_avx2+0xaf7>
   a6aa4:	xor    %eax,%eax
   a6aa6:	movabs $0x7fffffffffffffff,%rcx
   a6ab0:	xor    %r15d,%r15d
   a6ab3:	mov    (%rsp),%r11
   a6ab7:	mov    0x10(%rsp),%r9
   a6abc:	mov    %rbp,%r10
   a6abf:	mov    %rcx,%rbp
   a6ac2:	mov    $0xffffffff,%r8d
   a6ac8:	jmp    a75a0 <sessions::fast::parse_events_avx2+0x15e0>
<sessions::fast::ts::Calendar>::parse:
   a6acd:	movabs $0x7fffffffffffffff,%rbp
   a6ad7:	xor    %r15d,%r15d
   a6ada:	mov    0x10(%rsp),%r9
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:146
   a6adf:	jmp    a75a0 <sessions::fast::parse_events_avx2+0x15e0>
<sessions::fast::ts::Calendar>::parse:
   a6ae4:	xor    %eax,%eax
   a6ae6:	movabs $0x7fffffffffffffff,%rbp
   a6af0:	xor    %r15d,%r15d
   a6af3:	mov    0x10(%rsp),%r9
   a6af8:	mov    $0xffffffff,%r8d
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:193
   a6afe:	jmp    a75a0 <sessions::fast::parse_events_avx2+0x15e0>
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a6b03:	lea    (%rcx,%rcx,4),%rax
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:196
   a6b07:	shr    $0x8,%rcx
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a6b0b:	lea    (%rcx,%rax,2),%rax
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a6b0f:	mov    %rax,%rcx
   a6b12:	movabs $0xff000000ff,%rsi
   a6b1c:	and    %rsi,%rcx
   a6b1f:	movabs $0xf424000000064,%rdi
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a6b29:	imul   %rdi,%rcx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a6b2d:	shr    $0x10,%rax
   a6b31:	and    %rsi,%rax
   a6b34:	movabs $0x271000000001,%r8
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a6b3e:	imul   %r8,%rax
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a6b42:	add    %rcx,%rax
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a6b45:	shr    $0x20,%rax
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a6b49:	lea    (%rdx,%rdx,4),%rcx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:196
   a6b4d:	shr    $0x8,%rdx
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a6b51:	lea    (%rdx,%rcx,2),%rcx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a6b55:	mov    %rcx,%rdx
   a6b58:	and    %rsi,%rdx
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a6b5b:	imul   %rdi,%rdx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a6b5f:	shr    $0x10,%rcx
   a6b63:	and    %rsi,%rcx
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a6b66:	imul   %r8,%rcx
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a6b6a:	add    %rdx,%rcx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a6b6d:	shr    $0x20,%rcx
sessions::fast::ts::digits_padded:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:216
   a6b71:	imul   $0x5f5e100,%rax,%rax
   a6b78:	add    %rcx,%rax
   a6b7b:	mov    %rbp,%r9
   a6b7e:	mov    %rax,%rbp
   a6b81:	mov    0x20(%rsp),%r10
<sessions::fast::EventLines<sessions::fast::scan::Avx2> as sessions::fast::scan::Lines<7>>::line:
   a6b86:	mov    $0xffffffff,%r8d
   a6b8c:	blsr   0x8(%rsp),%rax
   a6b93:	mov    0x30(%rsp),%rdx
   a6b98:	lea    0x1(%rdx),%ecx
   a6b9b:	tzcnt  %rax,%rdi
   a6ba0:	shrx   %rcx,%r15,%rsi
   a6ba5:	and    $0x1,%esi
   a6ba8:	lea    (%rdx,%rsi,2),%r13d
   a6bac:	inc    %r13d
   a6baf:	xor    %eax,%eax
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/mod.rs:810
   a6bb1:	cmp    %r13d,%edi
   a6bb4:	je     a7593 <sessions::fast::parse_events_avx2+0x15d3>
   a6bba:	mov    %rbp,0x8(%rsp)
   a6bbf:	blsr   %r12,%rcx
   a6bc4:	tzcnt  %rcx,%r12
   a6bc9:	blsr   %rcx,%rcx
   a6bce:	lea    0x1(%r12),%edx
   a6bd3:	tzcnt  %rcx,%rcx
   a6bd8:	shrx   %rdx,%r14,%rbp
   a6bdd:	and    $0x1,%ebp
   a6be0:	lea    (%r12,%rbp,2),%edx
   a6be4:	inc    %edx
   a6be6:	cmp    %edx,%ecx
   a6be8:	je     a73fe <sessions::fast::parse_events_avx2+0x143e>
   a6bee:	mov    %rcx,0xa0(%rsp)
   a6bf6:	lea    0x1(%rdi),%eax
   a6bf9:	shrx   %rax,%r15,%rcx
   a6bfe:	and    $0x1,%ecx
   a6c01:	lea    (%rdi,%rcx,2),%eax
   a6c04:	inc    %eax
   a6c06:	mov    %ebx,%r15d
   a6c09:	sub    %eax,%r15d
<sessions::fast::ts::Calendar>::parse:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:156
   a6c0c:	je     a7032 <sessions::fast::parse_events_avx2+0x1072>
   a6c12:	mov    %r12,0x78(%rsp)
   a6c17:	lea    (%rcx,%rdi,1),%r12d
   a6c1b:	inc    %r12d
   a6c1e:	add    0x90(%rsp),%r12
   a6c26:	cmp    $0x19,%r15d
   a6c2a:	mov    %rbp,0x28(%rsp)
   a6c2f:	je     a6dd7 <sessions::fast::parse_events_avx2+0xe17>
   a6c35:	cmp    $0x14,%r15d
   a6c39:	jne    a703a <sessions::fast::parse_events_avx2+0x107a>
   a6c3f:	mov    %r15,%rbp
   a6c42:	mov    %r13d,0x38(%rsp)
   a6c47:	cmpb   $0x5a,0x13(%r12)
   a6c4d:	jne    a7104 <sessions::fast::parse_events_avx2+0x1144>
   a6c53:	mov    %edx,0x74(%rsp)
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a6c57:	mov    (%r12),%rdx
   a6c5b:	mov    0x910(%r9),%rax
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a6c62:	imul   %rdx,%rax
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:126
   a6c66:	shr    $0x3c,%rax
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:127
   a6c6a:	cmp    %rdx,0x6c8(%r9,%rax,8)
   a6c72:	mov    %rdi,0x80(%rsp)
   a6c7a:	mov    %rsi,0x98(%rsp)
   a6c82:	mov    %r10,%rbx
   a6c85:	jne    a7d7c <sessions::fast::parse_events_avx2+0x1dbc>
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:128
   a6c8b:	mov    0x748(%r9,%rax,8),%rcx
   a6c93:	mov    %r9,%r13
   a6c96:	mov    0x7c8(%r9,%rax,8),%rdx
   a6c9e:	mov    0x28(%rsp),%rbp
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a6ca3:	movzwl 0x8(%r12),%esi
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:132
   a6ca9:	xor    $0x3030,%rsi
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a6cb0:	mov    0xb(%r12),%rdi
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:134
   a6cb5:	mov    %rdi,%rax
   a6cb8:	movabs $0x3030303030303030,%r8
   a6cc2:	xor    %r8,%rax
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a6cc5:	lea    0x7676(%rsi),%r8d
sessions::fast::ts::digit_fault:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:187
   a6ccc:	or     %esi,%r8d
   a6ccf:	and    $0x8080,%r8d
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a6cd6:	movabs $0x7676767676767676,%r9
   a6ce0:	add    %rax,%r9
sessions::fast::ts::digit_fault:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:187
   a6ce3:	or     %rdi,%r9
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:137
   a6ce6:	movabs $0x8080008080008080,%r10
   a6cf0:	and    %r10,%r9
   a6cf3:	xor    %r10d,%r10d
   a6cf6:	cmpb   $0x54,0xa(%r12)
   a6cfc:	setne  %r10b
   a6d00:	movabs $0xff0000ff0000,%r11
   a6d0a:	and    %r11,%rdi
   a6d0d:	or     %r10,%rdi
   a6d10:	or     %r9,%rdi
   a6d13:	or     %r8,%rdi
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:138
   a6d16:	movabs $0x3a00003a0000,%r8
   a6d20:	cmp    %r8,%rdi
   a6d23:	jne    a7259 <sessions::fast::parse_events_avx2+0x1299>
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a6d29:	lea    (%rax,%rax,4),%rdi
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:142
   a6d2d:	shr    $0x8,%rax
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a6d31:	lea    (%rax,%rdi,2),%r9
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:145
   a6d35:	mov    %r9,%rax
   a6d38:	shr    $0x30,%rax
   a6d3c:	movzbl %al,%edi
   a6d3f:	xor    %eax,%eax
   a6d41:	cmp    $0x3b,%rdi
   a6d45:	mov    (%rsp),%r11
   a6d49:	mov    %rbx,%r10
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:146
   a6d4c:	ja     a7321 <sessions::fast::parse_events_avx2+0x1361>
   a6d52:	mov    %r9d,%r8d
   a6d55:	shr    $0x18,%r8d
   a6d59:	cmp    $0x3b,%r8d
   a6d5d:	ja     a7321 <sessions::fast::parse_events_avx2+0x1361>
   a6d63:	movzbl %r9b,%r9d
   a6d67:	cmp    $0x17,%r9d
   a6d6b:	ja     a7321 <sessions::fast::parse_events_avx2+0x1361>
   a6d71:	mov    %r10,%rbx
   a6d74:	movzbl %sil,%r10d
   a6d78:	lea    (%r10,%r10,4),%r10
   a6d7c:	shr    $0x8,%esi
   a6d7f:	lea    (%rsi,%r10,2),%rsi
   a6d83:	test   %rsi,%rsi
   a6d86:	je     a7aa4 <sessions::fast::parse_events_avx2+0x1ae4>
   a6d8c:	cmp    %rdx,%rsi
   a6d8f:	mov    %rbx,%r10
   a6d92:	jg     a7321 <sessions::fast::parse_events_avx2+0x1361>
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:149
   a6d98:	add    %rcx,%rsi
   a6d9b:	imul   $0x15180,%rsi,%rax
   a6da2:	imul   $0xe10,%r9,%rcx
   a6da9:	imul   $0x3c,%r8,%rdx
   a6dad:	add    %rdi,%rcx
   a6db0:	add    %rdx,%rcx
   a6db3:	add    %rax,%rcx
   a6db6:	imul   $0x3e8,%rcx,%rbx
   a6dbd:	add    $0xfffffffffad9a400,%rbx
   a6dc4:	mov    %r13,%r9
   a6dc7:	mov    $0xffffffff,%r8d
   a6dcd:	mov    0x38(%rsp),%r13d
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:150
   a6dd2:	jmp    a73f3 <sessions::fast::parse_events_avx2+0x1433>
<sessions::fast::ts::Calendar>::parse:
   a6dd7:	mov    %r13d,0x38(%rsp)
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:159
   a6ddc:	movzbl 0x13(%r12),%r13d
   a6de2:	cmp    $0x2b,%r13d
   a6de6:	je     a6df5 <sessions::fast::parse_events_avx2+0xe35>
   a6de8:	mov    %r15,%rbp
   a6deb:	cmp    $0x2d,%r13d
   a6def:	jne    a7104 <sessions::fast::parse_events_avx2+0x1144>
   a6df5:	mov    %edx,0x74(%rsp)
   a6df9:	mov    %rsi,0x98(%rsp)
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a6e01:	mov    (%r12),%rdx
   a6e05:	mov    0x910(%r9),%rax
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a6e0c:	imul   %rdx,%rax
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:126
   a6e10:	shr    $0x3c,%rax
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:127
   a6e14:	cmp    %rdx,0x6c8(%r9,%rax,8)
   a6e1c:	mov    %r9,0x10(%rsp)
   a6e21:	mov    %rdi,0x80(%rsp)
   a6e29:	mov    %r10,%rbx
   a6e2c:	jne    a7d1b <sessions::fast::parse_events_avx2+0x1d5b>
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:128
   a6e32:	mov    0x748(%r9,%rax,8),%rcx
   a6e3a:	mov    0x7c8(%r9,%rax,8),%rsi
   a6e42:	mov    0x28(%rsp),%rbp
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a6e47:	movzwl 0x8(%r12),%r9d
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:132
   a6e4d:	xor    $0x3030,%r9
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a6e54:	mov    0xb(%r12),%rdx
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:134
   a6e59:	mov    %rdx,%rax
   a6e5c:	movabs $0x3030303030303030,%rdi
   a6e66:	xor    %rdi,%rax
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a6e69:	lea    0x7676(%r9),%edi
sessions::fast::ts::digit_fault:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:187
   a6e70:	or     %r9d,%edi
   a6e73:	and    $0x8080,%edi
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a6e79:	movabs $0x7676767676767676,%r8
   a6e83:	add    %rax,%r8
sessions::fast::ts::digit_fault:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:187
   a6e86:	or     %rdx,%r8
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:137
   a6e89:	movabs $0x8080008080008080,%r10
   a6e93:	and    %r10,%r8
   a6e96:	xor    %r10d,%r10d
   a6e99:	cmpb   $0x54,0xa(%r12)
   a6e9f:	setne  %r10b
   a6ea3:	movabs $0xff0000ff0000,%r11
   a6ead:	and    %r11,%rdx
   a6eb0:	or     %r10,%rdx
   a6eb3:	or     %r8,%rdx
   a6eb6:	or     %rdi,%rdx
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:138
   a6eb9:	movabs $0x3a00003a0000,%rdi
   a6ec3:	cmp    %rdi,%rdx
   a6ec6:	jne    a719d <sessions::fast::parse_events_avx2+0x11dd>
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a6ecc:	lea    (%rax,%rax,4),%rdx
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:142
   a6ed0:	shr    $0x8,%rax
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a6ed4:	lea    (%rax,%rdx,2),%r8
<sessions::fast::ts::Calendar>::date_time:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:145
   a6ed8:	mov    %r8,%rax
   a6edb:	shr    $0x30,%rax
   a6edf:	movzbl %al,%edx
   a6ee2:	xor    %eax,%eax
   a6ee4:	cmp    $0x3b,%rdx
   a6ee8:	mov    (%rsp),%r11
   a6eec:	mov    %rbx,%r10
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:146
   a6eef:	ja     a7334 <sessions::fast::parse_events_avx2+0x1374>
   a6ef5:	mov    %r8d,%edi
   a6ef8:	shr    $0x18,%edi
   a6efb:	cmp    $0x3b,%edi
   a6efe:	ja     a7334 <sessions::fast::parse_events_avx2+0x1374>
   a6f04:	movzbl %r8b,%r8d
   a6f08:	cmp    $0x17,%r8d
   a6f0c:	ja     a7334 <sessions::fast::parse_events_avx2+0x1374>
   a6f12:	mov    %r10,0x20(%rsp)
   a6f17:	movzbl %r9b,%r10d
   a6f1b:	lea    (%r10,%r10,4),%r10
   a6f1f:	shr    $0x8,%r9d
   a6f23:	lea    (%r9,%r10,2),%r9
   a6f27:	test   %r9,%r9
   a6f2a:	je     a7a9c <sessions::fast::parse_events_avx2+0x1adc>
   a6f30:	cmp    %rsi,%r9
   a6f33:	mov    0x20(%rsp),%r10
   a6f38:	jg     a7334 <sessions::fast::parse_events_avx2+0x1374>
<sessions::fast::ts::Calendar>::parse:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:165
   a6f3e:	cmpb   $0x3a,0x16(%r12)
   a6f44:	jne    a7332 <sessions::fast::parse_events_avx2+0x1372>
   a6f4a:	movzbl 0x14(%r12),%esi
   a6f50:	add    $0xd0,%sil
   a6f54:	xor    %eax,%eax
   a6f56:	cmp    $0x9,%sil
   a6f5a:	ja     a7334 <sessions::fast::parse_events_avx2+0x1374>
   a6f60:	movzbl 0x15(%r12),%r11d
   a6f66:	add    $0xd0,%r11b
   a6f6a:	cmp    $0x9,%r11b
   a6f6e:	ja     a78e0 <sessions::fast::parse_events_avx2+0x1920>
   a6f74:	movzbl 0x17(%r12),%ebx
   a6f7a:	add    $0xd0,%bl
   a6f7d:	cmp    $0x9,%bl
   a6f80:	ja     a78e0 <sessions::fast::parse_events_avx2+0x1920>
   a6f86:	movzbl 0x18(%r12),%r10d
   a6f8c:	add    $0xd0,%r10b
   a6f90:	cmp    $0x9,%r10b
   a6f94:	ja     a7347 <sessions::fast::parse_events_avx2+0x1387>
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:168
   a6f9a:	movzbl %sil,%eax
   a6f9e:	add    %eax,%eax
   a6fa0:	lea    (%rax,%rax,4),%esi
   a6fa3:	add    %r11b,%sil
   a6fa6:	xor    %eax,%eax
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:170
   a6fa8:	cmp    $0x17,%sil
   a6fac:	ja     a7347 <sessions::fast::parse_events_avx2+0x1387>
   a6fb2:	movzbl %bl,%r11d
   a6fb6:	add    %r11d,%r11d
   a6fb9:	lea    (%r11,%r11,4),%r11d
   a6fbd:	add    %r10b,%r11b
   a6fc0:	cmp    $0x3b,%r11b
   a6fc4:	ja     a7347 <sessions::fast::parse_events_avx2+0x1387>
   a6fca:	add    %rcx,%r9
   a6fcd:	imul   $0x15180,%r9,%rax
   a6fd4:	imul   $0xe10,%r8,%rcx
   a6fdb:	imul   $0x3c,%rdi,%rdi
   a6fdf:	add    %rdx,%rcx
   a6fe2:	add    %rdi,%rcx
   a6fe5:	add    %rax,%rcx
   a6fe8:	imul   $0x3e8,%rcx,%rax
   a6fef:	add    $0xfffffffffad9a400,%rax
<i64 as core::convert::From<u8>>::from:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/convert/num.rs:82
   a6ff5:	movzbl %r11b,%ecx
   a6ff9:	movzbl %sil,%edx
<sessions::fast::ts::Calendar>::parse:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:173
   a6ffd:	imul   $0x36ee80,%rdx,%rdx
   a7004:	imul   $0xea60,%rcx,%rcx
   a700b:	add    %rdx,%rcx
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:174
   a700e:	mov    %rcx,%rbx
   a7011:	neg    %rbx
   a7014:	cmp    $0x2b,%r13b
   a7018:	cmovne %rcx,%rbx
   a701c:	add    %rax,%rbx
   a701f:	mov    (%rsp),%r11
   a7023:	mov    0x10(%rsp),%r9
   a7028:	mov    0x20(%rsp),%r10
   a702d:	jmp    a6dc7 <sessions::fast::parse_events_avx2+0xe07>
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:156
   a7032:	mov    %r15d,%eax
   a7035:	jmp    a7401 <sessions::fast::parse_events_avx2+0x1441>
   a703a:	mov    %r15,%rbp
<usize as core::cmp::PartialOrd>::le:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/cmp.rs:1918
   a703d:	cmp    $0x11,%r15d
<sessions::fast::ts::Calendar>::parse:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:176
   a7041:	jae    a7111 <sessions::fast::parse_events_avx2+0x1151>
   a7047:	mov    %edx,0x74(%rsp)
   a704b:	mov    %rsi,0x98(%rsp)
sessions::fast::ts::digits_padded:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:211
   a7053:	cmp    $0x9,%ebp
   a7056:	jae    a71b9 <sessions::fast::parse_events_avx2+0x11f9>
sessions::fast::ts::head:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:206
   a705c:	lea    0x0(,%rbp,8),%ecx
   a7063:	xor    %eax,%eax
<u64>::checked_shr:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2162
   a7065:	cmp    $0x8,%ebp
   a7068:	movabs $0x3030303030303030,%rsi
   a7072:	shrx   %rcx,%rsi,%rcx
   a7077:	cmove  %rax,%rcx
sessions::fast::ts::head:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:206
   a707b:	neg    %bpl
   a707e:	shl    $0x3,%bpl
   a7082:	shlx   %rbp,(%r12),%rdx
   a7088:	or     %rdx,%rcx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:192
   a708b:	xor    %rsi,%rcx
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a708e:	movabs $0x7676767676767676,%rsi
   a7098:	add    %rcx,%rsi
sessions::fast::ts::digit_fault:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:187
   a709b:	or     %rdx,%rsi
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:193
   a709e:	movabs $0x8080808080808080,%rdx
   a70a8:	test   %rdx,%rsi
   a70ab:	jne    a73fe <sessions::fast::parse_events_avx2+0x143e>
   a70b1:	mov    %rdi,0x80(%rsp)
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a70b9:	lea    (%rcx,%rcx,4),%rax
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:196
   a70bd:	shr    $0x8,%rcx
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a70c1:	lea    (%rcx,%rax,2),%rbx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a70c5:	mov    %rbx,%rax
   a70c8:	movabs $0xff000000ff,%rcx
   a70d2:	and    %rcx,%rax
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a70d5:	movabs $0xf424000000064,%rdx
   a70df:	imul   %rdx,%rax
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a70e3:	shr    $0x10,%rbx
   a70e7:	and    %rcx,%rbx
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a70ea:	movabs $0x271000000001,%rcx
   a70f4:	imul   %rcx,%rbx
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a70f8:	add    %rax,%rbx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a70fb:	shr    $0x20,%rbx
   a70ff:	jmp    a73ee <sessions::fast::parse_events_avx2+0x142e>
<usize as core::cmp::PartialOrd>::le:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/cmp.rs:1918
   a7104:	cmp    %eax,%ebx
   a7106:	mov    0x38(%rsp),%r13d
<core::ops::range::RangeInclusive<usize> as core::ops::range::RangeBounds<usize>>::contains::<usize>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ops/range.rs:873
   a710b:	je     a73fc <sessions::fast::parse_events_avx2+0x143c>
<sessions::fast::ts::Calendar>::parse:
   a7111:	mov    %edx,0x74(%rsp)
   a7115:	mov    %rsi,0x98(%rsp)
   a711d:	mov    %rdi,0x80(%rsp)
   a7125:	xor    %eax,%eax
   a7127:	xor    %edx,%edx
   a7129:	xor    %ecx,%ecx
   a712b:	xor    %esi,%esi
   a712d:	xor    %ebx,%ebx
   a712f:	nop
sessions::fast::ts::epoch:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:226
   a7130:	movzbl (%r12,%rdx,1),%edi
<u8>::wrapping_sub:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2621
   a7135:	add    $0xd0,%dil
sessions::fast::ts::epoch:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:228
   a7139:	cmp    $0x9,%dil
   a713d:	ja     a718f <sessions::fast::parse_events_avx2+0x11cf>
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:231
   a713f:	test   %dil,%dil
   a7142:	setne  %r8b
   a7146:	or     %r8b,%sil
<u32 as core::convert::From<bool>>::from:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/convert/num.rs:61
   a7149:	movzbl %sil,%r8d
   a714d:	and    $0x1,%r8d
sessions::fast::ts::epoch:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:232
   a7151:	add    %r8d,%ecx
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a7154:	lea    (%rbx,%rbx,4),%r8
<u64 as core::convert::From<u8>>::from:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/convert/num.rs:82
   a7158:	movzbl %dil,%edi
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a715c:	lea    (%rdi,%r8,2),%rbx
<core::ptr::non_null::NonNull<u8> as core::cmp::PartialEq>::eq:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/non_null.rs:1714
   a7160:	inc    %rdx
   a7163:	cmp    %rdx,%rbp
<core::slice::iter::Iter<u8> as core::iter::traits::iterator::Iterator>::next:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/slice/iter/macros.rs:180
   a7166:	jne    a7130 <sessions::fast::parse_events_avx2+0x1170>
sessions::fast::ts::epoch:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:235
   a7168:	cmp    $0x14,%ecx
   a716b:	setb   %al
   a716e:	test   %rbx,%rbx
   a7171:	setns  %cl
   a7174:	and    %al,%cl
<sessions::fast::EventLines<sessions::fast::scan::Avx2> as sessions::fast::scan::Lines<7>>::line:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/mod.rs:811
   a7176:	cmp    $0x1,%cl
   a7179:	mov    $0xffffffff,%r8d
   a717f:	mov    0x28(%rsp),%rbp
   a7184:	je     a73f3 <sessions::fast::parse_events_avx2+0x1433>
   a718a:	jmp    a73fc <sessions::fast::parse_events_avx2+0x143c>
   a718f:	xor    %r15d,%r15d
   a7192:	mov    $0xffffffff,%r8d
   a7198:	jmp    a7401 <sessions::fast::parse_events_avx2+0x1441>
   a719d:	xor    %eax,%eax
   a719f:	xor    %r15d,%r15d
   a71a2:	mov    (%rsp),%r11
   a71a6:	mov    0x10(%rsp),%r9
   a71ab:	mov    %rbx,%r10
   a71ae:	mov    $0xffffffff,%r8d
   a71b4:	jmp    a7401 <sessions::fast::parse_events_avx2+0x1441>
   a71b9:	mov    %r13d,0x38(%rsp)
   a71be:	mov    %rdi,0x80(%rsp)
   a71c6:	mov    %r10,0x20(%rsp)
   a71cb:	mov    %r9,%r13
sessions::fast::ts::digits_padded:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:214
   a71ce:	lea    -0x8(%rbp),%rdx
sessions::fast::ts::head:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:206
   a71d2:	lea    0x0(,%rdx,8),%ecx
   a71d9:	xor    %eax,%eax
<u64>::checked_shr:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2162
   a71db:	cmp    $0x10,%rbp
   a71df:	movabs $0x3030303030303030,%r10
   a71e9:	shrx   %rcx,%r10,%rcx
   a71ee:	cmove  %rax,%rcx
sessions::fast::ts::head:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:206
   a71f2:	mov    %edx,%esi
   a71f4:	neg    %sil
   a71f7:	shl    $0x3,%sil
   a71fb:	shlx   %rsi,(%r12),%rsi
   a7201:	or     %rsi,%rcx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:192
   a7204:	xor    %r10,%rcx
   a7207:	movabs $0x7676767676767676,%r9
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a7211:	lea    (%rcx,%r9,1),%rdi
sessions::fast::ts::digit_fault:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:187
   a7215:	or     %rsi,%rdi
   a7218:	movabs $0x8080808080808080,%r8
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:193
   a7222:	test   %r8,%rdi
   a7225:	jne    a7243 <sessions::fast::parse_events_avx2+0x1283>
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a7227:	mov    (%r12,%rdx,1),%rax
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:192
   a722b:	mov    %rax,%rdx
   a722e:	xor    %r10,%rdx
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a7231:	lea    (%rdx,%r9,1),%rsi
sessions::fast::ts::digit_fault:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:187
   a7235:	or     %rax,%rsi
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:193
   a7238:	test   %r8,%rsi
   a723b:	je     a7363 <sessions::fast::parse_events_avx2+0x13a3>
sessions::fast::scan::fused_region::<7, 3, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>:
   a7241:	xor    %eax,%eax
   a7243:	xor    %r15d,%r15d
   a7246:	mov    %r13,%r9
   a7249:	mov    0x20(%rsp),%r10
   a724e:	mov    $0xffffffff,%r8d
   a7254:	jmp    a7401 <sessions::fast::parse_events_avx2+0x1441>
   a7259:	xor    %eax,%eax
   a725b:	xor    %r15d,%r15d
   a725e:	mov    (%rsp),%r11
   a7262:	mov    %r13,%r9
   a7265:	mov    %rbx,%r10
   a7268:	mov    $0xffffffff,%r8d
   a726e:	jmp    a7401 <sessions::fast::parse_events_avx2+0x1441>
   a7273:	movabs $0x7fffffffffffffff,%rbp
   a727d:	xor    %r15d,%r15d
   a7280:	mov    (%rsp),%r11
   a7284:	jmp    a6af3 <sessions::fast::parse_events_avx2+0xb33>
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:459
   a7289:	mov    %r15,%rdi
   a728c:	mov    %r11,%rsi
   a728f:	mov    %r12,%rdx
   a7292:	lea    0xb0(%rsp),%rcx
   a729a:	vzeroupper
   a729d:	call   3c810 <sessions::fast::scan::spill::<7, sessions::fast::EventLines<sessions::fast::scan::Avx2>>>
   a72a2:	jmp    a72bd <sessions::fast::parse_events_avx2+0x12fd>
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:482
   a72a4:	mov    %r15,%rdi
   a72a7:	mov    %r11,%rsi
   a72aa:	mov    %r12,%rdx
   a72ad:	lea    0xb0(%rsp),%rcx
   a72b5:	vzeroupper
   a72b8:	call   403c0 <sessions::fast::scan::general::<7, sessions::fast::scan::Avx2, sessions::fast::EventLines<sessions::fast::scan::Avx2>>>
   a72bd:	vmovdqa -0x9e865(%rip),%xmm15        # 8a60 <__abi_tag+0x8764>
   a72c5:	vmovdqa -0x9e3ed(%rip),%xmm14        # 8ee0 <__abi_tag+0x8be4>
   a72cd:	vmovdqa -0x9e0a5(%rip),%xmm13        # 9230 <__abi_tag+0x8f34>
   a72d5:	vpbroadcastb -0x9d8f6(%rip),%ymm12        # 99e8 <__abi_tag+0x96ec>
   a72de:	vpbroadcastb -0x9d900(%rip),%ymm11        # 99e7 <__abi_tag+0x96eb>
   a72e7:	vpbroadcastb -0x9d90a(%rip),%ymm10        # 99e6 <__abi_tag+0x96ea>
   a72f0:	mov    %rax,%r11
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:436
   a72f3:	cmp    %r12,%r11
   a72f6:	jb     a60b7 <sessions::fast::parse_events_avx2+0xf7>
   a72fc:	jmp    a7e63 <sessions::fast::parse_events_avx2+0x1ea3>
   a7301:	movabs $0x7fffffffffffffff,%rbp
   a730b:	xor    %r15d,%r15d
   a730e:	mov    0x10(%rsp),%r9
   a7313:	mov    %r13,%r10
   a7316:	mov    $0xffffffff,%r8d
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:193
   a731c:	jmp    a75a0 <sessions::fast::parse_events_avx2+0x15e0>
<sessions::fast::EventLines<sessions::fast::scan::Avx2> as sessions::fast::scan::Lines<7>>::line:
   a7321:	xor    %r15d,%r15d
   a7324:	mov    %r13,%r9
   a7327:	mov    $0xffffffff,%r8d
   a732d:	jmp    a7401 <sessions::fast::parse_events_avx2+0x1441>
   a7332:	xor    %eax,%eax
   a7334:	xor    %r15d,%r15d
   a7337:	mov    0x10(%rsp),%r9
   a733c:	mov    $0xffffffff,%r8d
   a7342:	jmp    a7401 <sessions::fast::parse_events_avx2+0x1441>
   a7347:	xor    %r15d,%r15d
   a734a:	mov    (%rsp),%r11
   a734e:	mov    0x10(%rsp),%r9
   a7353:	mov    0x20(%rsp),%r10
   a7358:	mov    $0xffffffff,%r8d
   a735e:	jmp    a7401 <sessions::fast::parse_events_avx2+0x1441>
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a7363:	lea    (%rcx,%rcx,4),%rax
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:196
   a7367:	shr    $0x8,%rcx
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a736b:	lea    (%rcx,%rax,2),%rax
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a736f:	mov    %rax,%rcx
   a7372:	movabs $0xff000000ff,%rsi
   a737c:	and    %rsi,%rcx
   a737f:	movabs $0xf424000000064,%rdi
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a7389:	imul   %rdi,%rcx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a738d:	shr    $0x10,%rax
   a7391:	and    %rsi,%rax
   a7394:	movabs $0x271000000001,%r8
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a739e:	imul   %r8,%rax
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a73a2:	add    %rcx,%rax
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a73a5:	shr    $0x20,%rax
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a73a9:	lea    (%rdx,%rdx,4),%rcx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:196
   a73ad:	shr    $0x8,%rdx
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a73b1:	lea    (%rdx,%rcx,2),%rcx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a73b5:	mov    %rcx,%rdx
   a73b8:	and    %rsi,%rdx
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a73bb:	imul   %rdi,%rdx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a73bf:	shr    $0x10,%rcx
   a73c3:	and    %rsi,%rcx
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a73c6:	imul   %r8,%rcx
<u64>::wrapping_add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2584
   a73ca:	add    %rdx,%rcx
sessions::fast::ts::eight:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:200
   a73cd:	shr    $0x20,%rcx
sessions::fast::ts::digits_padded:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/ts.rs:216
   a73d1:	imul   $0x5f5e100,%rax,%rbx
   a73d8:	add    %rcx,%rbx
   a73db:	mov    %r13,%r9
   a73de:	mov    0x20(%rsp),%r10
   a73e3:	mov    $0xffffffff,%r8d
   a73e9:	mov    0x38(%rsp),%r13d
<sessions::fast::EventLines<sessions::fast::scan::Avx2> as sessions::fast::scan::Lines<7>>::line:
   a73ee:	mov    0x28(%rsp),%rbp
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/mod.rs:812
   a73f3:	cmp    %rbx,0x918(%r9)
   a73fa:	jle    a740b <sessions::fast::parse_events_avx2+0x144b>
   a73fc:	xor    %eax,%eax
   a73fe:	xor    %r15d,%r15d
   a7401:	mov    0x8(%rsp),%rbp
   a7406:	jmp    a75a0 <sessions::fast::parse_events_avx2+0x15e0>
   a740b:	xor    %eax,%eax
   a740d:	mov    0x8(%rsp),%rdx
   a7412:	cmp    %rbx,%rdx
   a7415:	setns  %al
   a7418:	movabs $0x7fffffffffffffff,%rcx
   a7422:	add    %rcx,%rax
   a7425:	mov    %rdx,%rcx
   a7428:	sub    %rbx,%rcx
   a742b:	cmovo  %rax,%rcx
   a742f:	xor    %eax,%eax
   a7431:	cmp    0x920(%r9),%rbx
   a7438:	jge    a73fe <sessions::fast::parse_events_avx2+0x143e>
   a743a:	cmp    $0x5265c00,%rcx
   a7441:	jg     a73fe <sessions::fast::parse_events_avx2+0x143e>
   a7443:	mov    0x18(%rsp),%rsi
   a7448:	lea    0x1(%rsi),%eax
   a744b:	shrx   %rax,%r14,%rax
   a7450:	and    $0x1,%eax
   a7453:	lea    (%rsi,%rax,2),%edx
   a7456:	inc    %edx
   a7458:	mov    0x78(%rsp),%r12
   a745d:	mov    %r12d,%ecx
   a7460:	sub    %edx,%ecx
   a7462:	add    %rsi,%rax
   a7465:	inc    %rax
   a7468:	mov    0x40(%rsp),%rdi
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a746d:	mov    (%rdi,%rax,1),%rax
<sessions::fast::EventLines<sessions::fast::scan::Avx2> as sessions::fast::scan::Lines<7>>::line:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/mod.rs:817
   a7471:	cmp    $0x8,%ecx
   a7474:	jne    a7517 <sessions::fast::parse_events_avx2+0x1557>
   a747a:	movabs $0x6573616863727570,%rdx
   a7484:	cmp    %rdx,%rax
   a7487:	jne    a7517 <sessions::fast::parse_events_avx2+0x1557>
   a748d:	mov    0xa0(%rsp),%rdx
   a7495:	lea    0x1(%rdx),%eax
   a7498:	shrx   %rax,%r14,%rax
   a749d:	and    $0x1,%eax
   a74a0:	lea    (%rdx,%rax,2),%ecx
   a74a3:	inc    %ecx
   a74a5:	mov    0xa8(%rsp),%r15
sessions::events::parse_price:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/events.rs:90
   a74ad:	cmp    %ecx,%r15d
   a74b0:	je     a73fc <sessions::fast::parse_events_avx2+0x143c>
   a74b6:	mov    %r13d,0x38(%rsp)
   a74bb:	mov    %edx,%esi
   a74bd:	sub    0x74(%rsp),%esi
   a74c1:	add    %eax,%edx
   a74c3:	inc    %edx
   a74c5:	mov    %rdi,%r13
   a74c8:	add    %rdi,%rdx
   a74cb:	sub    %ecx,%r15d
   a74ce:	lea    (%r12,%rbp,1),%rcx
   a74d2:	inc    %rcx
   a74d5:	xor    %r14d,%r14d
   a74d8:	xor    %edi,%edi
   a74da:	mov    0x8(%rsp),%rbp
<core::ptr::non_null::NonNull<u8> as core::cmp::PartialEq>::eq:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/non_null.rs:1714
   a74df:	cmp    %rdi,%r15
<core::slice::iter::Iter<u8> as core::iter::traits::iterator::Iterator>::next:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/slice/iter/macros.rs:180
   a74e2:	je     a794a <sessions::fast::parse_events_avx2+0x198a>
sessions::events::parse_price:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/events.rs:94
   a74e8:	movzbl (%rdx,%rdi,1),%eax
<u8>::is_ascii_digit:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/mod.rs:959
   a74ec:	add    $0xd0,%al
   a74ee:	cmp    $0x9,%al
   a74f0:	ja     a7a92 <sessions::fast::parse_events_avx2+0x1ad2>
sessions::events::parse_price:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/events.rs:98
   a74f6:	lea    (%r14,%r14,4),%r8d
<u32 as core::convert::From<u8>>::from:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/convert/num.rs:82
   a74fa:	movzbl %al,%eax
sessions::events::parse_price:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/events.rs:98
   a74fd:	lea    (%rax,%r8,2),%r14d
   a7501:	mov    $0xffffffff,%r8d
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/events.rs:99
   a7507:	inc    %rdi
   a750a:	xor    %eax,%eax
   a750c:	cmp    $0x989680,%r14d
   a7513:	jbe    a74df <sessions::fast::parse_events_avx2+0x151f>
   a7515:	jmp    a7593 <sessions::fast::parse_events_avx2+0x15d3>
<sessions::fast::EventLines<sessions::fast::scan::Avx2> as sessions::fast::scan::Lines<7>>::line:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/mod.rs:816
   a7517:	cmp    $0x77656976,%eax
   a751c:	sete   %dl
   a751f:	cmp    $0x74726163,%eax
   a7524:	sete   %sil
   a7528:	xor    %eax,%eax
   a752a:	cmp    $0x4,%ecx
   a752d:	mov    0x8(%rsp),%rbp
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/mod.rs:819
   a7532:	jne    a7593 <sessions::fast::parse_events_avx2+0x15d3>
   a7534:	or     %sil,%dl
   a7537:	je     a7593 <sessions::fast::parse_events_avx2+0x15d3>
   a7539:	xor    %r12d,%r12d
   a753c:	mov    0x30(%rsp),%rax
   a7541:	mov    0x80(%rsp),%r8
   a7549:	mov    0x98(%rsp),%rcx
   a7551:	sub    %r13d,%r8d
   a7554:	add    %rax,%rcx
   a7557:	inc    %rcx
<core::option::Option<sessions::fast::ident::Decoder>>::as_ref:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/option.rs:742
   a755a:	movzbl 0xb0(%r9),%edx
   a7562:	cmp    $0x2,%dl
   a7565:	sete   %al
   a7568:	lea    -0xa(%r8),%esi
   a756c:	cmp    $0xfffffff8,%esi
   a756f:	setb   %sil
sessions::fast::user_k::<sessions::fast::scan::Avx2>:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/mod.rs:610
   a7573:	or     %al,%sil
   a7576:	je     a7668 <sessions::fast::parse_events_avx2+0x16a8>
sessions::fast::scan::pack_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:146
   a757c:	cmp    $0xa,%r8d
   a7580:	mov    0x90(%rsp),%rdi
   a7588:	jbe    a77f4 <sessions::fast::parse_events_avx2+0x1834>
   a758e:	jmp    a7bba <sessions::fast::parse_events_avx2+0x1bfa>
<sessions::fast::EventLines<sessions::fast::scan::Avx2> as sessions::fast::scan::Lines<7>>::line:
   a7593:	xor    %r15d,%r15d
   a7596:	cs nopw 0x0(%rax,%rax,1)
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/mod.rs:840
   a75a0:	mov    0xb8(%rsp),%rsi
   a75a8:	mov    0xc0(%rsp),%r12
<u64>::wrapping_mul:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/num/uint_macros.rs:2660
   a75b0:	mov    %r10,%rcx
   a75b3:	movabs $0x9e3779b97f4a7c15,%rdx
   a75bd:	imul   %rdx,%rcx
   a75c1:	movzbl 0x968(%r9),%edx
sessions::fast::part_of:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/mod.rs:763
   a75c9:	xor    %edi,%edi
   a75cb:	sub    %dl,%dil
   a75ce:	shrx   %rdi,%rcx,%r14
<alloc::raw_vec::RawVecInner>::non_null::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/alloc/src/raw_vec/mod.rs:614
   a75d3:	mov    0x68(%r12),%rcx
<sessions::fast::sink::Sink<sessions::fast::EventRec>>::push:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/sink.rs:116
   a75d8:	movzbl (%rcx,%r14,1),%edi
<*mut sessions::fast::sink::Line>::add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mut_ptr.rs:961
   a75dd:	mov    %r14,%rbx
   a75e0:	shl    $0x6,%rbx
   a75e4:	add    0x50(%r12),%rbx
<sessions::fast::sink::Sink<sessions::fast::EventRec>>::push:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/sink.rs:119
   a75e9:	lea    0x1(%rdi),%rdx
<*mut sessions::fast::EventRec>::add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mut_ptr.rs:961
   a75ed:	shl    $0x5,%edi
core::ptr::write::<sessions::fast::EventRec>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:1933
   a75f0:	mov    %r10,(%rdi,%rbx,1)
   a75f4:	mov    %rax,0x8(%rdi,%rbx,1)
   a75f9:	mov    %rbp,0x10(%rdi,%rbx,1)
   a75fe:	mov    %r8d,0x18(%rdi,%rbx,1)
   a7603:	mov    %r15d,0x1c(%rdi,%rbx,1)
<sessions::fast::sink::Sink<sessions::fast::EventRec>>::push:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/sink.rs:119
   a7608:	cmp    $0x2,%rdx
   a760c:	jne    a608b <sessions::fast::parse_events_avx2+0xcb>
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/sink.rs:120
   a7612:	movb   $0x0,(%rcx,%r14,1)
<alloc::raw_vec::RawVecInner>::non_null::<*mut sessions::fast::EventRec>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/alloc/src/raw_vec/mod.rs:614
   a7617:	mov    0x8(%r12),%rax
   a761c:	mov    0x20(%r12),%rdx
<sessions::fast::sink::Sink<sessions::fast::EventRec>>::push:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/sink.rs:121
   a7621:	mov    (%rax,%r14,8),%rcx
   a7625:	cmp    (%rdx,%r14,8),%rcx
   a7629:	je     a78f7 <sessions::fast::parse_events_avx2+0x1937>
core::core_arch::x86::sse2::_mm_stream_si128:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:1434
   a762f:	vmovaps (%rbx),%xmm0
   a7633:	movntdq %xmm0,(%rcx)
<*mut u8>::add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mut_ptr.rs:961
   a7637:	lea    0x10(%rcx),%rdx
core::core_arch::x86::sse2::_mm_stream_si128:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:1434
   a763b:	vmovaps 0x10(%rbx),%xmm0
   a7640:	movntdq %xmm0,(%rdx)
<*mut u8>::add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mut_ptr.rs:961
   a7644:	lea    0x20(%rcx),%rdx
core::core_arch::x86::sse2::_mm_stream_si128:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:1434
   a7648:	vmovaps 0x20(%rbx),%xmm0
   a764d:	movntdq %xmm0,(%rdx)
<*mut u8>::add:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mut_ptr.rs:961
   a7651:	add    $0x30,%rcx
core::core_arch::x86::sse2::_mm_stream_si128:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:1434
   a7655:	vmovdqa 0x30(%rbx),%xmm0
   a765a:	movntdq %xmm0,(%rcx)
<sessions::fast::sink::Sink<sessions::fast::EventRec>>::push:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/sink.rs:126
   a765e:	addq   $0x40,(%rax,%r14,8)
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/sink.rs:119
   a7663:	jmp    a6090 <sessions::fast::parse_events_avx2+0xd0>
<sessions::fast::EventLines<sessions::fast::scan::Avx2> as sessions::fast::scan::Lines<7>>::line:
   a7668:	mov    0x90(%rsp),%rdi
sessions::fast::scan::mixed_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:99
   a7670:	cmpb   $0x75,(%rdi,%rcx,1)
   a7674:	jne    a77f4 <sessions::fast::parse_events_avx2+0x1834>
   a767a:	cmp    $0x2,%r8d
   a767e:	jbe    a768b <sessions::fast::parse_events_avx2+0x16cb>
   a7680:	cmpb   $0x30,0x1(%rdi,%rcx,1)
   a7685:	je     a77f4 <sessions::fast::parse_events_avx2+0x1834>
core::ptr::copy_nonoverlapping::<u8>:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/ptr/mod.rs:551
   a768b:	vmovdqu (%rdi,%rcx,1),%xmm0
<core::core_arch::simd::Simd<i8, 16>>::splat:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/simd.rs:57
   a7690:	vmovd  %r8d,%xmm1
   a7695:	vpbroadcastb %xmm1,%xmm1
core::core_arch::x86::sse2::_mm_cmpgt_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:950
   a769a:	vpcmpgtb %xmm13,%xmm1,%xmm3
core::core_arch::x86::sse2::_mm_sub_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:381
   a769f:	vpaddb %xmm0,%xmm14,%xmm1
core::core_arch::x86::sse2::_mm_cmpeq_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:914
   a76a3:	vpmaxub -0x9ef5b(%rip),%xmm1,%xmm2        # 8750 <__abi_tag+0x8454>
   a76ab:	vpcmpeqb %xmm2,%xmm1,%xmm4
   a76af:	vpaddb -0x9f167(%rip),%xmm0,%xmm2        # 8550 <__abi_tag+0x8254>
   a76b7:	vpminub -0x9f45f(%rip),%xmm2,%xmm5        # 8260 <__abi_tag+0x7f64>
   a76bf:	vpcmpeqb %xmm5,%xmm2,%xmm5
core::core_arch::x86::sse2::_mm_movemask_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:1615
   a76c3:	vpand  %xmm4,%xmm5,%xmm4
   a76c7:	vpsllw $0x7,%xmm4,%xmm4
   a76cc:	vpand  %xmm4,%xmm3,%xmm3
   a76d0:	vpmovmskb %xmm3,%eax
sessions::fast::scan::mixed_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:110
   a76d4:	test   %eax,%eax
   a76d6:	jne    a77f4 <sessions::fast::parse_events_avx2+0x1834>
core::core_arch::x86::sse2::_mm_and_si128:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:863
   a76dc:	vpminub %xmm1,%xmm15,%xmm3
   a76e0:	vpcmpeqb %xmm3,%xmm1,%xmm3
   a76e4:	vpand  %xmm1,%xmm3,%xmm1
core::core_arch::x86::sse2::_mm_add_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:81
   a76e8:	vpaddb -0x9e950(%rip),%xmm0,%xmm0        # 8da0 <__abi_tag+0x8aa4>
core::core_arch::x86::sse2::_mm_and_si128:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:863
   a76f0:	vpmaxub -0x9ed28(%rip),%xmm2,%xmm3        # 89d0 <__abi_tag+0x86d4>
   a76f8:	vpcmpeqb %xmm3,%xmm2,%xmm2
   a76fc:	vpand  %xmm0,%xmm2,%xmm0
core::core_arch::x86::sse2::_mm_or_si128:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:889
   a7700:	vpor   %xmm1,%xmm0,%xmm0
sessions::fast::scan::mixed_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:117
   a7704:	mov    %r8,%rax
   a7707:	shl    $0x4,%rax
core::core_arch::x86::ssse3::_mm_shuffle_epi8:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/ssse3.rs:98
   a770b:	lea    -0x96f21(%rip),%rsi        # 107f1 <sessions::fast::scan::ALIGN>
   a7712:	vpshufb (%rax,%rsi,1),%xmm0,%xmm0
core::core_arch::x86::ssse3::_mm_maddubs_epi16:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/ssse3.rs:289
   a7718:	vpmaddubsw -0x9ecb1(%rip),%xmm0,%xmm0        # 8a70 <__abi_tag+0x8774>
core::core_arch::x86::sse2::_mm_madd_epi16:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/x86/sse2.rs:226
   a7721:	vpmaddwd -0x9f7d9(%rip),%xmm0,%xmm0        # 7f50 <__abi_tag+0x7c54>
core::core_arch::x86_64::sse2::_mm_cvtsi128_si64:
/rustc/2d8144b7880597b6e6d3dfd63a9a9efae3f533d3/library/core/src/../../stdarch/crates/core_arch/src/macros.rs:188
   a7729:	vmovq  %xmm0,%rax
sessions::fast::scan::mixed_avx2:
/tmp/claude-0/-home-user-yang-mills-workbench/c2b3cfae-3f5d-5b6f-8fe6-a6e757d1bb60/scratchpad/tracks/shopping-sessions/panel_s/parse/profnew/src/fast/scan.rs:121
   a772e:	mov    %eax,%esi
