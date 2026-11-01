/* Rasiti phone screens in Sesotho. One file for the real USSD server (api/ussd.js), the on-screen phones and WhatsApp.
   Screens are written in English; tr(text, 'st') turns each line into Sesotho. "{}" stands for a name, number or amount.
   Sesotho wording: draft to be checked by a fluent Sesotho speaker at RSL before the pilot. */
(function (w) {
  const MONTHS = [['January','Pherekhong'],['February','Hlakola'],['March','Hlakubele'],['April','Mmesa'],['May','Motšeanong'],['June','Phuptjane'],['July','Phupu'],['August','Phato'],['September','Loetse'],['October','Mphalane'],['November','Pulungoana'],['December','Tšitoe']];
  // [English pattern, Sesotho]. Option numbers ("1. ") are kept automatically, so menu items are listed without them.
  const LINES = [
    // main menus
    ['Rasiti receipts', 'Lirasiti tsa Rasiti'], ['I am a customer', 'Ke moreki'], ['I am a seller', 'Ke morekisi'],
    ['Questions & answers', 'Lipotso le likarabo'], ['Questions & tax help', 'Lipotso le thuso'], ['For customers', 'Bakeng sa bareki'], ['For sellers (tax help)', 'Bakeng sa barekisi (thuso ea lekhetho)'],
    ['Main menu', 'Qalo'], ['Menu', 'Lethathamo'], ['Back', 'Khutla'], ['Cancel', 'Hlakola'], ['Sesotho', 'Sesotho'], ['English', 'English'],
    ['Customer', 'Moreki'], ['Seller', 'Morekisi'],
    ['Get receipt for cash', 'Fumana rasiti ea kheshe'], ['Check a receipt', 'Hlahloba rasiti'], ['Rate a shop', 'Lekanya lebenkele'], ['My draw entries', 'Menyetla ea ka ea lotho'],
    ['Shops that give receipts', 'Mabenkele a fanang ka lirasiti'], ['Record cash sale', 'Ngola thekiso (kheshe)'], ['Confirm receipts ({})', 'Netefatsa lirasiti ({})'], ['My sales book', 'Buka ea ka ea thekiso'],
    ['Register for tax', 'Ngolisa lekhetho'], ['My tax & badge', 'Lekhetho la ka'], ['Join Rasiti (2 minutes)', 'Kena Rasiti (metsotso e 2)'], ['What do I get?', 'Ke fumana eng?'],
    ['Lumela {}', 'Lumela {}'], ['Code {} · Registered · SBT', 'Khoutu {} · O ngolisitse · SBT'], ['Code {} · Enrolled · not yet registered', 'Khoutu {} · O Rasiti · ha a so ngolise lekhetho'],
    ['Code {} · Registered', 'Khoutu {} · O ngolisitse'], ['Code {} · Not yet registered', 'Khoutu {} · Ha u so ngolise'],
    // welcome and registration of customers
    ['Lumela! 👋 Welcome to Rasiti, the receipt lottery.', 'Lumela! 👋 Rea u amohela ho Rasiti, lotho ea lirasiti.'],
    ['Register free to get receipts and win in the monthly draw.', 'Ingolise mahala ho fumana lirasiti le ho hapa lotho ea khoeli le khoeli.'],
    ['Register now', 'Ingolise hona joale'], ['How does it work?', 'E sebetsa joang?'],
    ['Every Rasiti receipt is a free ticket in the monthly prize draw: 1 entry per M10, double at registered sellers.', 'Rasiti e \'ngoe le e \'ngoe ke tekete ea mahala lotho ea khoeli: monyetla o le 1 bakeng sa M10 e \'ngoe le e \'ngoe, habeli ho barekisi ba ngolisitseng.'],
    ['Ask for a receipt every time you buy.', 'Kopa rasiti nako le nako ha u reka.'],
    ['Great! What is your first name?', 'Ho lokile! Lebitso la hau la pele ke mang?'], ['Please type your first name:', 'Ka kopo ngola lebitso la hau la pele:'],
    ['Thank you, {}! ✅ You are registered.', 'Kea leboha, {}! ✅ U ngolisitsoe.'],
    ['Your phone number is your Rasiti ID. Ask every seller for a Rasiti receipt.', 'Nomoro ea mohala oa hau ke boitsebiso ba hau ba Rasiti. Kopa rasiti ea Rasiti ho morekisi e mong le e mong.'],
    // customer flows
    ['Get a receipt', 'Fumana rasiti'], ['Seller code (on the sticker):', 'Khoutu ea morekisi (e setikareng):'], ['Seller {} is not on Rasiti.', 'Morekisi {} ha a eo ho Rasiti.'],
    ['Tell RSL about this seller', 'Bolella RSL ka morekisi enoa'], ['Amount you paid (M):', 'Chelete eo u e lefileng (M):'],
    ['No network.', 'Ha ho marang-rang.'], ['Your request is saved and will send when the signal returns.', 'Kopo ea hau e bolokiloe, e tla romeloa ha marang-rang a khutla.'],
    ['Sent to {}.', 'E rometsoe ho {}.'], ['You get your receipt by SMS when they confirm.', 'U tla fumana rasiti ka SMS ha ba netefatsa.'],
    ['Enter the receipt code:', 'Kenya khoutu ea rasiti:'], ['Enter the code, e.g. RS3307ABCDX:', 'Kenya khoutu, mohlala RS3307ABCDX:'],
    ['GENUINE', 'E NNETE'], ['NOT GENUINE', 'HA E NNETE'], ['That is not a Rasiti code.', 'Hona hase khoutu ea Rasiti.'], ['Codes look like RS-1234-ABCD-X.', 'Likhoutu li shebahala tjena: RS-1234-ABCD-X.'],
    ['Rasiti never issued this code. Do not accept it.', 'Rasiti ha e so ka e fana ka khoutu ena. U se ke ua e amohela.'], ['This code is not in the Rasiti register.', 'Khoutu ena ha e eo bukeng ea Rasiti.'],
    ['Amount printed on your paper receipt (M):', 'Chelete e ngotsoeng rasiting ea hau ea pampiri (M):'], ['Amounts do not match.', 'Lichelete ha li tšoane.'], ['Amounts match. All good.', 'Lichelete lia tšoana. Ho lokile.'],
    ['Real sale: {}', 'Thekiso ea nnete: {}'], ['Your paper: {}', 'Pampiri ea hau: {}'], ['Reported to RSL. Thank you.', 'Ho tlalehiloe ho RSL. Kea leboha.'],
    ['This receipt already belongs to another phone. It cannot be claimed twice.', 'Rasiti ena e se e le ea mohala o mong. E ke ke ea nkuoa habeli.'],
    ['Rate a shop you bought from', 'Lekanya lebenkele leo u rekileng ho lona'], ['I got a receipt', 'Ke fumane rasiti'], ['No receipt given', 'Ha kea fuoa rasiti'],
    ['Charged extra for receipt', 'Ke lefisitsoe chelete e eketsehileng'], ['Shop not on Rasiti', 'Lebenkele ha le eo ho Rasiti'], ['Fake receipt', 'Rasiti ea bohata'],
    ['Which shop? Type the seller code, or the shop name and where it is.', 'Lebenkele lefe? Ngola khoutu ea morekisi, kapa lebitso la lebenkele le moo le leng teng.'],
    ['Seller code, or the shop name and where it is:', 'Khoutu ea morekisi, kapa lebitso la lebenkele le moo le leng teng:'],
    ['Got your location. What is the shop called?', 'Re fumane sebaka sa hau. Lebenkele le bitsoa joang?'],
    ['Thank you.', 'Kea leboha.'], ['Shops that give receipts earn a public "Gives receipts" badge.', 'Mabenkele a fanang ka lirasiti a fumana letšoao la "E fana ka lirasiti".'],
    ['Your number is never shown to the seller. RSL acts when several customers report the same shop.', 'Nomoro ea hau ha e bontšoe morekisi. RSL e nka khato ha bareki ba \'maloa ba tlaleha lebenkele le le leng.'],
    ['You can report them: Customer > 3. Rate a shop.', 'U ka ba tlaleha: Moreki > 3. Lekanya lebenkele.'],
    ['My draw entries (this month)', 'Menyetla ea ka ea lotho (khoeling ena)'], ['My draw entries this month: {}', 'Menyetla ea ka khoeling ena: {}'], ['Live: {}', 'E sebetsang: {}'], ['Being checked: {}', 'E ntse e hlahlojoa: {}'],
    ['Next draw: {}', 'Lotho e latelang: {}'], ['Next draw: {} {}', 'Lotho e latelang: {} {}'],
    ['Tip: registered sellers give double entries.', 'Keletso: barekisi ba ngolisitseng ba fana ka menyetla e habeli.'], ['Registered sellers give double entries.', 'Barekisi ba ngolisitseng ba fana ka menyetla e habeli.'],
    ['Shops that give receipts (rated by customers)', 'Mabenkele a fanang ka lirasiti (ho ea ka bareki)'], ['Shops that give receipts:', 'Mabenkele a fanang ka lirasiti:'], ['None rated yet.', 'Ha ho le leng le lekantsoeng hajoale.'],
    ['Added. +{} entries.', 'Ho kentsoe. +{} menyetla.'], ['{} · +{} draw entries{}', '{} · +{} menyetla ea lotho{}'],
    // seller flows
    ['Lumela! Rasiti keeps a free sales book on your phone and brings customers who want receipts.', 'Lumela! Rasiti e u bolokela buka ea thekiso mahala mohaleng oa hau, \'me e u tlisetsa bareki ba batlang lirasiti.'],
    ['With Rasiti you get:', 'Ka Rasiti u fumana:'], ['- a free sales book', '- buka ea thekiso ea mahala'], ['- customers drawn by the prize draw sign', '- bareki ba hoheloang ke letšoao la lotho'],
    ['- a record banks can see', '- rekoto eo libanka li ka e bonang'], ['- simple tax, no queues', '- lekhetho le bonolo, ntle le mela'],
    ['Join Rasiti', 'Kena Rasiti'], ['Your name:', 'Lebitso la hau:'], ['Where do you trade? (e.g. Sefika rank)', 'U rekisetsa kae? (mohlala, Sefika rank)'], ['What do you sell?', 'U rekisa eng?'],
    ['Welcome {}!', 'Rea u amohela {}!'], ['Your seller code: {}', 'Khoutu ea hau ea morekisi: {}'], ['You can give receipts now. No tax number needed yet.', 'U ka fana ka lirasiti hona joale. Ha ho hlokehe nomoro ea lekhetho hajoale.'],
    ['Put the Rasiti sticker where customers can see it. You can give receipts now.', 'Beha setikara sa Rasiti moo bareki ba ka se bonang. U ka fana ka lirasiti hona joale.'],
    ['Enter your 4-digit seller code (or 0 to join Rasiti):', 'Kenya khoutu ea hau ea morekisi ea linomoro tse 4 (kapa 0 ho kena Rasiti):'],
    ['Seller code {} not found.', 'Khoutu ea morekisi {} ha e fumanehe.'], ['Dial again and choose 0 to join.', 'Letsetsa hape u khethe 0 ho kena.'],
    ['Amount (M):', 'Chelete (M):'], ['Amount (M), numbers only:', 'Chelete (M), linomoro feela:'], ['Sale {}', 'Thekiso {}'],
    ['Customer phone for their receipt SMS (or 0 to skip):', 'Mohala oa moreki bakeng sa SMS ea rasiti (kapa 0 ho tlola):'], ['Phone: 8 digits, or 0 to skip:', 'Mohala: linomoro tse 8, kapa 0 ho tlola:'],
    ['Recorded {}', 'Ho ngotsoe {}'], ['Receipt {}', 'Rasiti {}'], ['Customer gets it by SMS.', 'Moreki o e fumana ka SMS.'], ['Give the code to the customer.', 'Fa moreki khoutu.'],
    ['Customers asking for receipts', 'Bareki ba kopang lirasiti'], ['No receipts waiting.', 'Ha ho lirasiti tse emetseng.'], ['Yes, this was my sale', 'E, ena e ne e le thekiso ea ka'], ['Not my sale', 'Hase thekiso ea ka'],
    ['Confirmed. Receipt {} sent to the customer.', 'E netefalitsoe. Rasiti {} e rometsoe ho moreki.'], ['Confirmed.', 'E netefalitsoe.'], ['Receipt {} sent to the customer.', 'Rasiti {} e rometsoe ho moreki.'],
    ['Noted. The customer is told you did not confirm.', 'Ho ngotsoe. Moreki o tla bolelloa hore ha ua netefatsa.'], ['{} confirmed your receipt {}', '{} o netefalitse rasiti ea hau {}'],
    ['Today: {} sales, {}', 'Kajeno: lithekiso tse {}, {}'], ['7 days: {} sales, {}', 'Matsatsi a 7: lithekiso tse {}, {}'], ['30 days: {} sales, {}', 'Matsatsi a 30: lithekiso tse {}, {}'], ['Mobile money {} · cash {}', 'Chelete ea mohala {} · kheshe {}'],
    ['Sales last 30 days: {}', 'Thekiso matsatsing a 30: {}'], ['Yearly estimate: {}', 'Khakanyo ea selemo: {}'], ['You fit Simplified Business', 'U loketse Lekhetho le Bonolo la Khoebo'], ['Tax (under M2,000,000).', '(ka tlase ho M2,000,000).'],
    ['You fit Simplified Business Tax.', 'U loketse SBT.'],
    ['Registered sellers get double draw entries for customers, bigger seller prizes and a badge banks recognise.', 'Barekisi ba ngolisitseng ba fumana menyetla e habeli bakeng sa bareki, meputso e meholo ea barekisi le letšoao le tsebahalang libankeng.'],
    ['Your customers get double draw entries.', 'Bareki ba hau ba fumana menyetla e habeli.'], ['Ask a helper to call me', 'Kopa mothusi a ntetsetse'],
    ['A tax helper will call you within 2 working days.', 'Mothusi oa lekhetho o tla u letsetsa ka hare ho matsatsi a 2 a mosebetsi.'],
    ['Enter your ID number:', 'Kenya nomoro ea hau ea boitsebiso (ID):'], ['ID number (at least 6 digits):', 'Nomoro ea ID (bonyane linomoro tse 6):'], ['ID number must have at least 6 digits. Please start again.', 'Nomoro ea ID e lokela ho ba le linomoro tse 6 bonyane. Ka kopo qala hape.'],
    ['Done! TIN {}', 'Ho phethehile! TIN {}'], ['You are a registered seller.', 'U morekisi ea ngolisitseng.'], ['Your customers now earn double draw entries.', 'Bareki ba hau joale ba fumana menyetla e habeli ea lotho.'],
    ['First return due {}.', 'Tlaleho ea pele e lokela ho romeloa ka {}.'], ['First return due {}, prefilled from your book.', 'Tlaleho ea pele e lokela ka {}, e tlatsitsoe ho tsoa bukeng ea hau.'],
    // tax
    ['My tax', 'Lekhetho la ka'], ['My tax · TIN {}', 'Lekhetho la ka · TIN {}'], ['Badge: {}', 'Letšoao: {}'], ['File {} return{}', 'Romela tlaleho ea {}{}'], ['Pay tax ({} due)', 'Lefa lekhetho ({} e lokelang)'], ['Pay tax', 'Lefa lekhetho'],
    ['My tax record', 'Rekoto ea ka ea lekhetho'], ['Reminders: {}', 'Likhopotso: {}'], ['{} return', 'Tlaleho ea {}'], ['Your Rasiti sales book shows', 'Buka ea hau ea thekiso ea Rasiti e bontša'], ['{} for {}.', '{} bakeng sa {}.'],
    ['Add any sales without receipts.', 'Eketsa lithekiso tse se nang lirasiti.'], ['File this amount', 'Romela chelete ena'], ['Enter a different amount', 'Kenya chelete e fapaneng'], ['I did not trade (nil)', 'Ha kea rekisa (lefeela)'],
    ['Your sales book: {}', 'Buka ea hau ea thekiso: {}'], ['Your sales for {} (M):', 'Lithekiso tsa hau tsa {} (M):'], ['Your total sales for', 'Kakaretso ea lithekiso tsa hau tsa'], ['{} (M):', '{} (M):'],
    ['Why no trading?', 'Hobaneng u sa rekisa?'], ['Stall was closed', 'Setala se ne se koetsoe'], ['I was ill or away', 'Ke ne ke kula kapa ke le sieo'], ['Other reason', 'Lebaka le leng'],
    ['Filed! ✅ {}: {}', 'E rometsoe! ✅ {}: {}'], ['Filed! {}: {}{}', 'E rometsoe! {}: {}{}'], ['Ref RT-{}', 'Ref RT-{}'], ['Ref {}', 'Ref {}'], ['Ref {}. {}', 'Ref {}. {}'],
    ['Tax due {} by {}', 'Lekhetho {} ka {}'], ['Tax due {} by {}.', 'Lekhetho {} le lokela ka {}.'], ['(demo rate {}%).', '(sekhahla sa pontšo {}%).'], ['Tax due {} by {} (demo rate {}%).', 'Lekhetho {} ka {} (sekhahla sa pontšo {}%).'],
    ['Tax due {} by {} (demo rate {}%). Pay: My tax > 2.', 'Lekhetho {} ka {} (sekhahla sa pontšo {}%). Lefa: Lekhetho la ka > 2.'], ['Pay: My tax > 2.', 'Lefa: Lekhetho la ka > 2.'], ['Pay now', 'Lefa hona joale'],
    ['{} return filed: {}{}', 'Tlaleho ea {} e rometsoe: {}{}'], ['{} return filed: {}{}.', 'Tlaleho ea {} e rometsoe: {}{}.'], ['Nil return filed for {}.', 'Tlaleho ea lefeela e rometsoe bakeng sa {}.'],
    ['Reason: {}. Thank you.', 'Lebaka: {}. Kea leboha.'], ['A nil return is fine when you did not trade.', 'Tlaleho ea lefeela e lokile ha u sa rekisa.'],
    ['Nothing to pay. Thank you for paying on time!', 'Ha ho letho le lokelang ho lefuoa. Kea leboha ka ho lefa ka nako!'], ['Nothing to pay. Thank you for paying on time! ✅', 'Ha ho letho le lokelang ho lefuoa. Kea leboha ka ho lefa ka nako! ✅'],
    ['Tax due: {}', 'Lekhetho le lokelang: {}'], ['({} is overdue)', '({} e fetile nako)'], ['Demo rate {}% of declared sales.', 'Sekhahla sa pontšo {}% sa lithekiso tse boletsoeng.'],
    ['Pay all by mobile money', 'Lefa tsohle ka chelete ea mohala'], ['Pay part now (pay a little each week before the date)', 'Lefa karolo hona joale (lefa hanyane beke le beke pele ho letsatsi)'], ['Pay part now (pay a little each week)', 'Lefa karolo hona joale (hanyane beke le beke)'],
    ['Amount to pay now (M) (up to {}):', 'Chelete eo u e lefang hona joale (M) (ho fihlela {}):'], ['Amount to pay now (M):', 'Chelete eo u e lefang hona joale (M):'], ['Enter M1 to {}:', 'Kenya M1 ho isa {}:'],
    ['Mobile money: approve payment of {} to RSL on your phone (M-Pesa or EcoCash).', 'Chelete ea mohala: amohela tefo ea {} ho RSL mohaleng oa hau (M-Pesa kapa EcoCash).'], ['I approved it', 'Ke e amohetse'],
    ['Mobile money request for {} sent. Approve it on your phone.', 'Kopo ea chelete ea mohala ea {} e rometsoe. E amohele mohaleng oa hau.'],
    ['Paid {} ✅', 'E lefiloe {} ✅'], ['Still due: {}', 'E ntse e lokela: {}'], ['Still due: {} by {}', 'E ntse e lokela: {} ka {}'], ['({} overdue: pay it first to restart your streak)', '({} e fetile nako: e lefe pele ho qala letoto hape)'],
    ['All paid. Thank you!', 'Tsohle li lefiloe. Kea leboha!'], ['Ref {}. Still due: {}.', 'Ref {}. E ntse e lokela: {}.'], ['Ref {}. All paid. Thank you!', 'Ref {}. Tsohle li lefiloe. Kea leboha!'], ['On-time months in a row: {}', 'Likhoeli tse latellanang ka nako: {}'], ['No returns yet.', 'Ha ho litlaleho hajoale.'],
    ['No returns yet. File your first return under My tax > 1.', 'Ha ho litlaleho hajoale. Romela tlaleho ea pele ho Lekhetho la ka > 1.'],
    ['Reminders ON. We will SMS you 3 days before each due date.', 'Likhopotso LI BULETSOE. Re tla u romella SMS matsatsi a 3 pele ho letsatsi le leng le le leng la tefo.'],
    ['Reminders OFF. You can turn them on again here.', 'Likhopotso LI KOETSOE. U ka li bulela hape mona.'],
    ['Amount must be between M1 and {}. Start again.', 'Chelete e lokela ho ba pakeng tsa M1 le {}. Qala hape.'], ['Amount not valid. Please start again.', 'Chelete ha e nepahale. Ka kopo qala hape.'],
    // errors
    ['Please choose a number from the menu.', 'Ka kopo khetha nomoro lethathamong.'], ['Please choose a number from the list.', 'Ka kopo khetha nomoro lenaneng.'],
    ['Please choose 1 or 2.', 'Ka kopo khetha 1 kapa 2.'], ['Please choose 1 to 3.', 'Ka kopo khetha 1 ho isa 3.'], ['Please choose 1 to 4.', 'Ka kopo khetha 1 ho isa 4.'],
    ['Please choose 1 to 3. Start again.', 'Ka kopo khetha 1 ho isa 3. Qala hape.'], ['Please choose 1 to 5. Start again.', 'Ka kopo khetha 1 ho isa 5. Qala hape.'],
    ['Please choose 1 or 2. Dial again to start.', 'Ka kopo khetha 1 kapa 2. Letsetsa hape ho qala.'], ['Please choose 1, 2 or 3. Dial again to start.', 'Ka kopo khetha 1, 2 kapa 3. Letsetsa hape ho qala.'],
    ['Sorry, Rasiti is busy. Please try again.', 'Tšoarelo, Rasiti e phathahane. Ka kopo leka hape.'], ['USSD code not recognised.', 'Khoutu ea USSD ha e tsebahale.'], ['Dial *999# for Rasiti.', 'Letsetsa *999# bakeng sa Rasiti.'],
    ['Language: Sesotho', 'Puo: Sesotho'],
    // values that appear inside lines
    ['Registered seller', 'Morekisi ea ngolisitseng'],
  ];
  const WORDS = [['(done)', '(ho phethiloe)'], ['Rasiti Gold', 'Rasiti ea Khauta'], ['Rasiti Silver', 'Rasiti ea Silevera'], ['Reliable taxpayer', 'Molefi oa lekhetho ea tšepahalang'], ['months on time', 'likhoeli ka nako'], ['ON', 'LI BULETSOE'], ['OFF', 'LI KOETSOE'],
    ['stall closed', 'setala se koetsoe'], ['ill or away', 'ke ne ke kula kapa ke le sieo'], [' · paid ✓', ' · e lefiloe ✓'], [' · paid', ' · e lefiloe'], [' · owes ', ' · e kolota '], [' · no tax', ' · ha ho lekhetho'], [' · late', ' · e liehile'], ['nil', 'lefeela'], ['(nil)', '(lefeela)']];
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  LINES.push(['M{} on {}', 'M{} ka {}']);
  // Longest patterns first, so a specific line wins over a shorter one that also fits.
  const RX = LINES.slice().sort((a, b) => b[0].length - a[0].length).map(([en, st]) => [new RegExp('^' + esc(en).replace(/\\\{\\\}/g, '(.*?)') + '$'), st]);
  function line(l) {
    const m = l.match(/^(\s*\d{1,2}\.\s+)(.*)$/); if (m) return m[1] + line(m[2]);
    const t = l.trim(); if (!t) return l;
    for (const [rx, st] of RX) { const mm = t.match(rx); if (mm) { let i = 1; return words(st.replace(/\{\}/g, () => mm[i++] || '')); } }
    return words(l);
  }
  const WRX = WORDS.map(([en, st]) => [/^\w.*\w$/.test(en) ? new RegExp('\\b' + esc(en) + '\\b', 'g') : new RegExp(esc(en), 'g'), st]);
  function words(s) { for (const [rx, st] of WRX) s = s.replace(rx, st); for (const [en, st] of MONTHS) s = s.replace(new RegExp('\\b' + en + '\\b', 'g'), st).replace(new RegExp('\\b(\\d{1,2}) ' + en.slice(0, 3) + '\\b', 'g'), '$1 ' + st).replace(new RegExp('^' + en.slice(0, 3) + ':', 'g'), st.slice(0, 3) + ':'); return s; }
  // Screens wrap long sentences over short lines for small phones; join them back before translating.
  function unwrap(text) { const out = [];
    for (const l of text.split('\n')) { const p = out[out.length - 1];
      if (p && p.trim() && l.trim() && !/^\s*\d{1,2}\.\s/.test(p) && !/^\s*\d{1,2}\.\s/.test(l) && (/^\s*[a-z(]/.test(l) || /^\s{2}/.test(l)) && !/^\s*[-•✓+]/.test(l)) out[out.length - 1] = p.replace(/\s+$/, '') + ' ' + l.trim();
      else out.push(l); }
    return out; }
  function tr(text, lang) { if (lang !== 'st' || !text) return text; return unwrap(String(text)).map(line).join('\n'); }
  w.RASITI_I18N = { tr, months: MONTHS };
})(typeof window !== 'undefined' ? window : globalThis);
