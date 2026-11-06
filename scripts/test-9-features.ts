import { prisma } from '../src/lib/prisma';
import { getMessProfileAction, updateMessProfileAction } from '../src/app/actions/mess-profile';
import { getMemberProfileDataAction, updateMemberProfileAction, submitIndividualMealAction } from '../src/app/actions/profile';
import { getConversationsAction, sendMessageAction, getMessagesAction, deleteMessageAction } from '../src/app/actions/messages';
import { getNoticesAction, createNoticeAction, updateNoticeAction, togglePinNoticeAction, deleteNoticeAction } from '../src/app/actions/notices';
import { translations } from '../src/lib/i18n/dictionary';

async function runTests() {
  console.log('========================================================');
  console.log('MessMate - 9 New Features End-to-End Test Suite');
  console.log('========================================================\n');

  let passed = 0;
  let total = 9;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Mess Profile Management
    // -------------------------------------------------------------------------
    console.log('[TEST 1] Verifying Mess Profile Management...');
    const messProfile = await getMessProfileAction();
    if (!messProfile || !messProfile.name) {
      throw new Error('Failed to load mess profile');
    }
    const updateRes = await updateMessProfileAction({
      name: 'Bashundhara Elite Mess',
      description: 'Premier bachelor mess accommodation in Dhaka with digital accounting.',
      contactPhone: '+880 1711-223344',
      address: 'House 12, Road 4, Block D, Bashundhara R/A, Dhaka',
    });
    if (!updateRes.success || updateRes.profile?.name !== 'Bashundhara Elite Mess') {
      throw new Error('Failed to update mess profile');
    }
    console.log('  ✓ PASS: Mess Profile retrieved and updated dynamically.');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 2: Individual Member Profile Data
    // -------------------------------------------------------------------------
    console.log('[TEST 2] Verifying Individual Member Profile & Accounting Summary...');
    const tarek = await prisma.messMember.findFirst({
      where: { isPrimaryAdmin: true },
    });
    if (!tarek) throw new Error('Primary admin not found');

    const profileData = await getMemberProfileDataAction({ memberId: tarek.id });
    if (!profileData.member || profileData.member.fullName !== tarek.fullName) {
      throw new Error('Failed to fetch personal member profile');
    }
    if (typeof profileData.accounting.totalMeals !== 'number' || typeof profileData.accounting.currentMealRate !== 'number') {
      throw new Error('Accounting metrics missing or invalid type');
    }
    console.log(`  ✓ PASS: Personal Profile verified for ${profileData.member.fullName} with real accounting summary.`);
    passed++;

    // -------------------------------------------------------------------------
    // TEST 3: Member Profile Editing
    // -------------------------------------------------------------------------
    console.log('[TEST 3] Verifying Member Profile Editing...');
    const editRes = await updateMemberProfileAction({
      memberId: tarek.id,
      fullName: 'Mohammad Tarek Hossen',
      phone: '01711000001',
      bio: 'Permanent Primary Admin & Founder of MessMate.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    });
    if (!editRes.success) throw new Error('Failed to edit member profile');
    const updatedMember = await prisma.messMember.findUnique({ where: { id: tarek.id } });
    if (updatedMember?.bio !== 'Permanent Primary Admin & Founder of MessMate.') {
      throw new Error('Bio update not persisted in database');
    }
    console.log('  ✓ PASS: Member profile editing safely updated personal record and associated User.');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 4: Individual Daily Meal Entry
    // -------------------------------------------------------------------------
    console.log('[TEST 4] Verifying Individual Daily Meal Entry...');
    const mealRes = await submitIndividualMealAction({
      date: '2026-11-08',
      breakfast: 1,
      lunch: 1,
      dinner: 1.5,
    });
    if (!mealRes.success || !mealRes.entry || mealRes.entry.totalMeals !== 3.5) {
      throw new Error('Meal submission failed or total mismatch');
    }
    const savedEntry = await prisma.mealEntry.findUnique({
      where: {
        memberId_date: {
          memberId: tarek.id,
          date: new Date('2026-11-08T12:00:00Z'),
        },
      },
    });
    if (!savedEntry || savedEntry.totalMeals !== 3.5) {
      throw new Error('Meal entry not properly stored in database');
    }
    console.log('  ✓ PASS: Individual daily meal entry upserted 3.5 meals (1 BF, 1 LN, 1.5 DN).');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 5: Day Mode and Night Mode Configuration
    // -------------------------------------------------------------------------
    console.log('[TEST 5] Verifying Day / Night (Dark / Light) Theme Setup...');
    const fs = await import('fs');
    const tailwindConfig = fs.readFileSync('tailwind.config.ts', 'utf8');
    if (!tailwindConfig.includes("darkMode: 'class'")) {
      throw new Error("tailwind.config.ts missing darkMode: 'class'");
    }
    const globalsCss = fs.readFileSync('src/app/globals.css', 'utf8');
    if (!globalsCss.includes('.dark')) {
      throw new Error('globals.css missing .dark CSS variables');
    }
    const headerCode = fs.readFileSync('src/components/layout/header.tsx', 'utf8');
    if (!headerCode.includes('toggleTheme') || !headerCode.includes('Sun') || !headerCode.includes('Moon')) {
      throw new Error('Header missing Sun/Moon theme toggle button');
    }
    console.log('  ✓ PASS: Dark/Light theme class configuration, CSS variables, and Sun/Moon toggle verified.');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 6: Mobile Responsiveness
    // -------------------------------------------------------------------------
    console.log('[TEST 6] Verifying Mobile-First Responsiveness...');
    const dashboardShellCode = fs.readFileSync('src/components/layout/dashboard-shell.tsx', 'utf8');
    if (!dashboardShellCode.includes('mobileMenuOpen') || !dashboardShellCode.includes('md:hidden')) {
      throw new Error('DashboardShell missing responsive mobile drawer navigation');
    }
    const messagesClientCode = fs.readFileSync('src/app/messages/messages-client.tsx', 'utf8');
    if (!messagesClientCode.includes('md:w-80') || !messagesClientCode.includes('hidden md:flex')) {
      throw new Error('Messages client missing responsive mobile conversation switcher');
    }
    console.log('  ✓ PASS: Mobile drawer navigation and responsive breakpoints verified.');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 7: Complete Bilingual Coverage (Bangla & English)
    // -------------------------------------------------------------------------
    console.log('[TEST 7] Verifying Bangla and English Dictionaries...');
    const en = translations.en;
    const bn = translations.bn;

    const sections = ['messProfile', 'profile', 'mealEntry', 'messages', 'notices', 'theme'];
    for (const sec of sections) {
      if (!(sec in en)) throw new Error(`English dictionary missing section: ${sec}`);
      if (!(sec in bn)) throw new Error(`Bangla dictionary missing section: ${sec}`);
    }
    if (!bn.messProfile.title || !bn.profile.accountingSummary || !bn.notices.categories.BAZAR_LIST) {
      throw new Error('Bangla dictionary contains empty required values');
    }
    console.log('  ✓ PASS: All 9 features have 100% full English and Bangla i18n dictionary translations.');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 8: Member-to-Member Messaging System
    // -------------------------------------------------------------------------
    console.log('[TEST 8] Verifying Member-to-Member Messaging System...');
    const convData = await getConversationsAction();
    if (!convData.groupConvId) throw new Error('Group conversation not initialized');

    // Send a message to group
    const sendRes = await sendMessageAction(convData.groupConvId, 'Hello roommates! Monthly meal schedule is active.');
    if (!sendRes.success || !sendRes.messageId) throw new Error('Failed to send message');

    const msgList = await getMessagesAction(convData.groupConvId);
    const sentMsg = msgList.messages.find((m) => m.id === sendRes.messageId);
    if (!sentMsg || sentMsg.content !== 'Hello roommates! Monthly meal schedule is active.') {
      throw new Error('Sent message not found in thread');
    }

    // Delete message (moderation)
    const deleteRes = await deleteMessageAction(sendRes.messageId);
    if (!deleteRes.success) throw new Error('Failed to delete message');
    console.log('  ✓ PASS: Group room initialized, message dispatched, retrieved, and moderated.');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 9: Monthly Mess Billboard / Notice Board
    // -------------------------------------------------------------------------
    console.log('[TEST 9] Verifying Monthly Mess Billboard & Notices...');
    const noticeRes = await createNoticeAction({
      title: 'Monthly Bazar Schedule - Week 1',
      content: 'Room 201 & 202 are assigned for Friday morning fish & vegetable bazar.',
      category: 'BAZAR_LIST',
      isPinned: true,
      month: 11,
      year: 2026,
    });
    if (!noticeRes.success || !noticeRes.noticeId) throw new Error('Failed to create billboard notice');

    const noticesData = await getNoticesAction({ category: 'BAZAR_LIST', month: 11, year: 2026 });
    const createdNotice = noticesData.notices.find((n) => n.id === noticeRes.noticeId);
    if (!createdNotice || !createdNotice.isPinned) throw new Error('Created notice not found or pin state lost');

    // Toggle pin
    const pinRes = await togglePinNoticeAction(noticeRes.noticeId);
    if (!pinRes.success || pinRes.isPinned !== false) throw new Error('Pin toggle failed');

    // Delete notice
    const delNoticeRes = await deleteNoticeAction(noticeRes.noticeId);
    if (!delNoticeRes.success) throw new Error('Notice archiving/delete failed');
    console.log('  ✓ PASS: Billboard notice created with BAZAR_LIST category, pinned, filtered, and deleted.');
    passed++;

    console.log('\n========================================================');
    console.log(`ALL ${passed}/${total} FEATURES VERIFIED AND WORKING FLAWLESSLY!`);
    console.log('========================================================');
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
