/* Rasiti questions and answers for sellers and customers.
   One source for the real USSD server (api/ussd.js), the on-screen USSD phone and the WhatsApp chatbot.
   Tax facts: RSL press statements and the 2026 Income Tax amendments; anything not confirmed points the seller to RSL.
   This is general guidance. RSL confirms each person's exact obligations. */
(function (w) {
  const RSL = 'RSL PR desk: 62112502 or 58839868';
  const seller = [
    {s:'Must I pay tax?', q:'Do I have to pay tax?', a:'If you run a business and earn income, the law expects you to register with RSL and declare that income. Small earners often pay little or nothing: in 2026/27 a person with taxable income below about M61,200 a year pays no income tax. You should still register and file.'},
    {s:'What is SBT?', q:'What is Simplified Business Tax (SBT)?', a:'Simplified Business Tax is RSL\'s simpler tax for small businesses with yearly income below M2,000,000 in qualifying sectors. It means fewer forms and simple payments. When you register, RSL confirms whether you qualify, your rate and how often you file.'},
    {s:'How do I register?', q:'How do I register for tax?', a:'Registration is free. On Rasiti choose Seller, then 4 Register for tax, and enter your ID number to get a TIN (tax number). You can also ask a helper to call you, or visit any RSL office with your ID.'},
    {s:'When do I file?', q:'When do I have to file a return?', a:'Lesotho\'s tax year runs from 1 April to 31 March. Annual income tax returns are usually due by 30 June; check the exact date with RSL each year. SBT sellers file on the schedule RSL gives at registration. On Rasiti choose Seller, then 4 My tax, then 1 File: your return is prefilled from your sales book, and Rasiti reminds you before each due date.'},
    {s:'How do I pay?', q:'How do I pay my tax?', a:'On Rasiti choose Seller, then 4 My tax, then 2 Pay tax, and approve the mobile money request on your phone. You can pay in full or a little each week before the due date. You can also pay through RSL\'s e-payment platform or at an RSL office using your TIN. Keep the reference. If you cannot pay in full, talk to RSL before the due date.'},
    {s:'What records to keep?', q:'What records must I keep?', a:'Keep a record of every sale and every business cost, such as stock, rent and transport, with slips where you can. Rasiti\'s sales book records your receipted sales automatically and is a good starting point. Keep your records safe for several years.'},
    {s:'No sales this month?', q:'What if I made no sales?', a:'If you are registered you must still file. Declare nil (zero) and give the reason, for example the stall was closed or you were ill. A nil return is not wrong. RSL only asks questions when other records show sales, and it starts with a friendly call.'},
    {s:'How is tax worked out?', q:'How is my tax worked out?', a:'Normal income tax is on profit: sales minus business costs. For 2026/27 individuals pay 20% on the first M77,760 of taxable income a year and 30% above that, less a tax credit of M12,240. Under SBT, RSL tells you how your tax is worked out.'},
    {s:'Do I charge VAT?', q:'Do I need to charge VAT?', a:'VAT is a tax on sales that only larger businesses must register for, above a turnover level set by RSL. Most small sellers do not charge VAT. If your sales grow a lot, ask RSL whether you need to register for VAT.'},
    {s:'Late? Penalties?', q:'What happens if I file or pay late?', a:'Filing or paying late can lead to penalties and interest. If you know you will be late or cannot pay in full, call RSL before the due date to agree a plan. Rasiti sends you a reminder before each date.'},
    {s:'Is my data safe?', q:'Is my sales data safe?', a:'Your sales book is yours and is shared only with RSL for tax. Customers who rate your shop are never named, and customer phone numbers are never shown to you. RSL always starts with a friendly call, never an automatic penalty.'},
    {s:'Why register?', q:'What do I gain from registering?', a:'Registered sellers get double draw entries for their customers, a bonus when a customer wins with their receipt, a Registered seller badge, simple filing prefilled from the sales book, and a TIN, which banks and tenders often ask for.'},
    {s:'Talk to RSL', q:'How do I talk to RSL?', a:'Call the ' + RSL + ', visit any RSL office, or choose Ask a helper to call me under Register for tax. RSL also explains the process at rsl.org.ls/taxpayer-education. These answers are general guidance; RSL confirms your exact tax.'}
  ];
  const buyer = [
    {s:'Get a receipt', q:'How do I get a receipt?', a:'Pay a Rasiti seller by mobile money and the receipt comes by SMS automatically. Paying cash? Choose Customer, then 1 Get receipt, enter the seller code on their sticker and the amount. The seller confirms and you get the receipt by SMS.'},
    {s:'How do entries work?', q:'How do draw entries work?', a:'Every receipt with your number earns entries: 1 for every M10 spent, at least 1 and up to 5 per receipt. Entries double when the seller is registered for tax. See yours under Customer, then 4 My draw entries.'},
    {s:'When is the draw?', q:'When is the draw?', a:'The draw is held once a month, after the month ends. Each phone can win only once per draw. Winners are picked at random and RSL publishes the draw seed, so anyone can check the result.'},
    {s:'What can I win?', q:'What can I win?', a:'Every month: M5,000, M2,000 and M1,000 in cash, plus 20 prizes of M100 airtime. The seller who issued the winning receipt also gets a bonus.'},
    {s:'How do I claim?', q:'How do I claim a prize?', a:'Winners get an SMS from RSL and confirm with their ID. Rasiti and RSL never ask you to pay money or share a PIN to claim a prize. If anyone does, it is a scam: report it to RSL.'},
    {s:'Is a receipt real?', q:'How do I check that a receipt is real?', a:'Choose Customer, then 2 Check a receipt, and type the code (it looks like RS-1234-ABCD-X). Rasiti tells you if it is genuine, with the shop and amount. Fake codes are reported to RSL automatically.'},
    {s:'Report a shop', q:'How do I report a shop?', a:'After buying, choose Customer, then 3 Rate a shop: say if you got a receipt, were charged extra, or the shop is not on Rasiti. RSL acts only when several different customers report the same shop.'},
    {s:'Is my number shared?', q:'Is my phone number shared?', a:'No. Your number is never shown to sellers or other customers. RSL staff see it masked; full numbers are used only to pay prizes, and every time staff view them it is logged.'},
    {s:'Why receipts?', q:'Why does RSL want receipts?', a:'Taxes pay for schools, clinics and roads. When customers ask for receipts, more businesses join the tax system fairly and honest sellers are not undercut.'},
    {s:'Does it cost money?', q:'Does Rasiti cost money?', a:'No. Getting receipts, checking them and entering the draw are free.'},
    {s:'Talk to RSL', q:'How do I talk to RSL?', a:'Call the ' + RSL + ', or visit any RSL office.'}
  ];
  // Sesotho (same order as above). Draft wording, to be checked by a fluent Sesotho speaker at RSL before the pilot.
  const RSL_ST = 'Desk ea PR ea RSL: 62112502 kapa 58839868';
  const ST = {
    seller: [
      {s:'Na ke lokela ho lefa?', q:'Na ke lokela ho lefa lekhetho?', a:'Haeba u etsa khoebo \'me u fumana chelete, molao o lebeletse hore u ingolise le RSL \'me u bolele chelete eo. Ba fumanang hanyane hangata ba lefa hanyane kapa ha ba lefe letho: ka 2026/27 motho ea nang le chelete e lefisoang ka tlase ho M61,200 ka selemo ha a lefe lekhetho la chelete. Leha ho le joalo u lokela ho ingolisa le ho romela litlaleho.'},
      {s:'SBT ke eng?', q:'Lekhetho le Bonolo la Khoebo (SBT) ke eng?', a:'Lekhetho le Bonolo la Khoebo ke lekhetho le bonolo la RSL bakeng sa likhoebo tse nyane tse nang le chelete ea selemo ka tlase ho M2,000,000 makaleng a amoheloang. Le bolela liforomo tse fokolang le litefo tse bonolo. Ha u ingolisa, RSL e tla netefatsa hore na u a tšoaneleha, sekhahla sa hau le hore u romela litlaleho hangata hakae.'},
      {s:'Ke ingolisa joang?', q:'Ke ingolisetsa lekhetho joang?', a:'Ho ingolisa ke mahala. Ho Rasiti khetha Morekisi, ebe 4 Ingolisetse lekhetho, u kenye nomoro ea hau ea ID ho fumana TIN (nomoro ea lekhetho). U ka boela ua kopa mothusi hore a u letsetse, kapa ua etela ofisi efe kapa efe ea RSL le ID ea hau.'},
      {s:'Ke romela neng?', q:'Ke lokela ho romela tlaleho neng?', a:'Selemo sa lekhetho Lesotho se qala ka la 1 Mmesa ho fihlela la 31 Hlakubele. Litlaleho tsa selemo tsa lekhetho la chelete hangata li lokela ka la 30 Phuptjane; netefatsa letsatsi le nepahetseng le RSL selemo le selemo. Barekisi ba SBT ba romela ho ea ka kemiso eo RSL e e fanang ha ba ingolisa. Ho Rasiti khetha Morekisi, 4 Lekhetho la ka, ebe 1 Romela: tlaleho ea hau e tlatsitsoe ho tsoa bukeng ea hau ea thekiso, \'me Rasiti e u hopotsa pele ho letsatsi le leng le le leng.'},
      {s:'Ke lefa joang?', q:'Ke lefa lekhetho la ka joang?', a:'Ho Rasiti khetha Morekisi, 4 Lekhetho la ka, ebe 2 Lefa lekhetho, \'me u amohele kopo ea chelete ea mohala mohaleng oa hau. U ka lefa kaofela kapa hanyane beke le beke pele ho letsatsi. U ka boela ua lefa ka sistimi ea RSL ea litefo tsa elektronike kapa ofising ea RSL u sebelisa TIN ea hau. Boloka nomoro ea tefo. Haeba u sa khone ho lefa kaofela, bua le RSL pele ho letsatsi.'},
      {s:'Ke boloka lirekoto life?', q:'Ke lokela ho boloka lirekoto life?', a:'Ngola thekiso e \'ngoe le e \'ngoe le litšenyehelo tsohle tsa khoebo, joalo ka thepa, rente le lipalangoang, ka lirasiti moo ho khonehang. Buka ea thekiso ea Rasiti e ngola lithekiso tsa hau tse nang le lirasiti ka bo eona \'me ke qalo e ntle. Boloka lirekoto tsa hau hantle ka lilemo tse \'maloa.'},
      {s:'Ha kea rekisa?', q:'Ho thoe\'ng haeba ke sa rekisa letho?', a:'Haeba u ngolisitse, u ntse u lokela ho romela tlaleho. Bolela lefeela (zero) \'me u fane ka lebaka, mohlala setala se ne se koetsoe kapa u ne u kula. Tlaleho ea lefeela ha e fosahale. RSL e botsa feela ha lirekoto tse ling li bontša lithekiso, \'me e qala ka mohala o mosa.'},
      {s:'Lekhetho le baloa joang?', q:'Lekhetho la ka le baloa joang?', a:'Lekhetho le tloaelehileng la chelete le lefuoa phaellong: lithekiso ho tlosoa litšenyehelo tsa khoebo. Ka 2026/27 batho ba lefa 20% ho M77,760 ea pele ea chelete e lefisoang ka selemo le 30% ho e fetang moo, ho tlosoe phokotso ea lekhetho ea M12,240. Tlas\'a SBT, RSL e tla u bolella hore na lekhetho la hau le baloa joang.'},
      {s:'Na ke lefisa VAT?', q:'Na ke lokela ho lefisa VAT?', a:'VAT ke lekhetho la thekiso leo feela likhoebo tse kholo li lokelang ho le ngolisetsa, ka holim\'a boemo ba thekiso bo behiloeng ke RSL. Barekisi ba bangata ba banyenyane ha ba lefise VAT. Haeba thekiso ea hau e hola haholo, botsa RSL hore na u lokela ho ngolisetsa VAT.'},
      {s:'Ho lieha? Likotlo?', q:'Ho etsahala\'ng haeba ke liehisa ho romela kapa ho lefa?', a:'Ho romela kapa ho lefa ka morao ho nako ho ka tlisa likotlo le tsoala. Haeba u tseba hore u tla lieha kapa u ke ke ua khona ho lefa kaofela, letsetsa RSL pele ho letsatsi ho lumellana ka moralo. Rasiti e u romella khopotso pele ho letsatsi le leng le le leng.'},
      {s:'Data ea ka e bolokehile?', q:'Na data ea thekiso ea ka e bolokehile?', a:'Buka ea hau ea thekiso ke ea hau \'me e arolelanoa le RSL feela bakeng sa lekhetho. Bareki ba lekanyang lebenkele la hau ha ba bolelloe ka mabitso, \'me linomoro tsa mehala ea bareki ha li bontšoe uena. RSL e lula e qala ka mohala o mosa, eseng ka kotlo e iketsahallang.'},
      {s:'Ke ingolisetsa\'ng?', q:'Ke fumana eng ha ke ingolisa?', a:'Barekisi ba ngolisitseng ba fumana menyetla e habeli ea lotho bakeng sa bareki ba bona, moputso ha moreki a hapa ka rasiti ea bona, letšoao la Morekisi ea ngolisitseng, ho romela litlaleho ho bonolo ho tsoa bukeng ea thekiso, le TIN eo libanka le lithendara hangata li e batlang.'},
      {s:'Bua le RSL', q:'Ke bua le RSL joang?', a:'Letsetsa ' + RSL_ST + ', etela ofisi efe kapa efe ea RSL, kapa khetha Kopa mothusi a ntetsetse tlas\'a Ingolisetse lekhetho. RSL e boetse e hlalosa mokhoa ho rsl.org.ls/taxpayer-education. Likarabo tsena ke tataiso e akaretsang; RSL e netefatsa lekhetho la hau hantle.'}
    ],
    buyer: [
      {s:'Fumana rasiti', q:'Ke fumana rasiti joang?', a:'Lefa morekisi oa Rasiti ka chelete ea mohala \'me rasiti e tla ka SMS ka bo eona. U lefa ka kheshe? Khetha Moreki, ebe 1 Fumana rasiti, u kenye khoutu ea morekisi e setikareng sa hae le chelete. Morekisi oa netefatsa \'me u fumana rasiti ka SMS.'},
      {s:'Menyetla e sebetsa joang?', q:'Menyetla ea lotho e sebetsa joang?', a:'Rasiti e \'ngoe le e \'ngoe e nang le nomoro ea hau e u fa menyetla: o le 1 bakeng sa M10 e \'ngoe le e \'ngoe, bonyane o le 1 ho fihlela ho e 5 rasiting e le \'ngoe. Menyetla e ba habeli ha morekisi a ngolisitse lekhetho. E bone ho Moreki, ebe 4 Menyetla ea ka ea lotho.'},
      {s:'Lotho e neng?', q:'Lotho e etsoa neng?', a:'Lotho e etsoa hang ka khoeli, kamora hore khoeli e fele. Mohala o mong le o mong o ka hapa hang feela lothong e le \'ngoe. Bahapi ba khethoa ka lehlohonolo \'me RSL e phatlalatsa nomoro ea lotho (seed), e le hore mang kapa mang a ka hlahloba sephetho.'},
      {s:'Nka hapa eng?', q:'Nka hapa eng?', a:'Khoeli le khoeli: M5,000, M2,000 le M1,000 ka kheshe, hammoho le meputso e 20 ea airtime ea M100. Morekisi ea fanileng ka rasiti e hapileng le eena o fumana moputso.'},
      {s:'Ke nka moputso joang?', q:'Ke nka moputso oa ka joang?', a:'Bahapi ba fumana SMS ho tsoa ho RSL \'me ba netefatsa ka ID ea bona. Rasiti le RSL ha li ke li u kopa ho lefa chelete kapa ho arolelana PIN ho nka moputso. Haeba motho a etsa joalo, ke bomenemene: tlaleha ho RSL.'},
      {s:'Rasiti ke ea nnete?', q:'Ke hlahloba joang hore rasiti ke ea nnete?', a:'Khetha Moreki, ebe 2 Hlahloba rasiti, u ngole khoutu (e shebahala tjena: RS-1234-ABCD-X). Rasiti e tla u bolella hore na ke ea nnete, le lebenkele le chelete. Likhoutu tsa bohata li tlalehoa ho RSL ka bo tsona.'},
      {s:'Tlaleha lebenkele', q:'Ke tlaleha lebenkele joang?', a:'Kamora ho reka, khetha Moreki, ebe 3 Lekanya lebenkele: bolela hore na u fumane rasiti, u lefisitsoe ho eketsehileng, kapa lebenkele ha le eo ho Rasiti. RSL e nka khato feela ha bareki ba fapaneng ba \'maloa ba tlaleha lebenkele le le leng.'},
      {s:'Nomoro ea ka e arolelanoa?', q:'Na nomoro ea mohala oa ka e arolelanoa?', a:'Che. Nomoro ea hau ha e bontšoe barekisi kapa bareki ba bang. Basebetsi ba RSL ba e bona e patiloe; linomoro tse feletseng li sebelisoa feela ho lefa meputso, \'me nako le nako ha basebetsi ba li sheba ho a ngoloa.'},
      {s:'Hobaneng lirasiti?', q:'Hobaneng RSL e batla lirasiti?', a:'Lekhetho le lefella likolo, litliliniki le litsela. Ha bareki ba kopa lirasiti, likhoebo tse ngata li kena tsamaisong ea lekhetho ka toka \'me barekisi ba tšepahalang ha ba hlōloe ka mokhoa o sa lokang.'},
      {s:'Na e a lefelloa?', q:'Na Rasiti ea lefelloa?', a:'Che. Ho fumana lirasiti, ho li hlahloba le ho kena lothong ke mahala.'},
      {s:'Bua le RSL', q:'Ke bua le RSL joang?', a:'Letsetsa ' + RSL_ST + ', kapa u etele ofisi efe kapa efe ea RSL.'}
    ]
  };
  const LBL = {en:{seller:'Tax & seller help', buyer:'Customer help', more:'More questions', next:'Next', back:'Questions', choose:'Choose', reply:'Reply with a number:'},
               st:{seller:'Thuso ea lekhetho le barekisi', buyer:'Thuso ea bareki', more:'Lipotso tse ling', next:'E latelang', back:'Lipotso', choose:'Khetha', reply:'Araba ka nomoro:'}};
  const SETS = {seller:{title:'Tax & seller help', list:seller}, buyer:{title:'Customer help', list:buyer}};
  const listOf = (set, lang) => lang === 'st' ? ST[set] : SETS[set].list;
  const lbl = lang => LBL[lang === 'st' ? 'st' : 'en'];
  const PER = 4, PAGE = 112;
  function pages(t, lang) { const max = lang === 'st' ? 90 : PAGE; const out = []; let cur = ''; for (const wd of t.split(' ')) { if ((cur + ' ' + wd).trim().length > max) { out.push(cur.trim()); cur = wd; } else cur += ' ' + wd; } if (cur.trim()) out.push(cur.trim()); return out; }
  // Short USSD screens. parts = answers typed after opening the Q&A. 1-4 picks a question, 8 = more questions,
  // inside an answer 1 = next part and 9 = other questions. The caller adds its own "main menu" line.
  function ussd(set, parts, lang) {
    const L = listOf(set, lang), B = lbl(lang), S = {title:B[set]}; const np = Math.ceil(L.length / PER); let lp = 0, qi = -1, ap = 0, note = '';
    for (const t of parts || []) {
      if (qi < 0) { if (t === '8') { lp = (lp + 1) % np; note = ''; } else { const n = parseInt(t, 10); const i = lp * PER + n - 1; if (n >= 1 && n <= PER && i < L.length) { qi = i; ap = 0; note = ''; } else note = B.choose + ' 1-' + Math.min(PER, L.length - lp * PER) + '\n'; } }
      else { const pg = pages(L[qi].a, lang); if (t === '1' && ap < pg.length - 1) ap++; else if (t === '9') qi = -1; else note = ''; }
    }
    if (qi < 0) return note + S.title + ' (' + (lp + 1) + '/' + np + ')\n' + L.slice(lp * PER, lp * PER + PER).map((x, i) => (i + 1) + '. ' + x.s).join('\n') + '\n8. ' + B.more;
    const pg = pages(L[qi].a, lang);
    return L[qi].s + (pg.length > 1 ? ' (' + (ap + 1) + '/' + pg.length + ')' : '') + '\n' + pg[ap] + '\n' + (ap < pg.length - 1 ? '1. ' + B.next + '  ' : '') + '9. ' + B.back;
  }
  // Full WhatsApp messages: the whole list, and whole answers.
  function chatList(set, lang) { const B = lbl(lang); return '📘 ' + B[set] + '\n' + B.reply + '\n\n' + listOf(set, lang).map((x, i) => (i + 1) + '. ' + x.q).join('\n'); }
  function chatAnswer(set, n, lang) { const x = listOf(set, lang)[n - 1]; return x ? '*' + x.q + '*\n\n' + x.a : null; }
  // Free-text questions on WhatsApp: finds the closest question by shared words (question words count double).
  const STOP = new Set('i me my a an the is are am do does did to of in on for and or what how when where why who can will be it this that with you your we our if at by from have has not no yes please'.split(' '));
  const words = t => String(t).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(x => x.length > 2 && !STOP.has(x)).map(x => x.replace(/(ing|es|s)$/, ''));
  function match(set, text) { const tw = new Set(words(text)); if (!tw.size) return 0; let best = 0, bs = 0;
    SETS[set].list.forEach((x, i) => { const y = ST[set][i] || {}; let sc = 0; for (const wq of new Set(words(x.q + ' ' + x.s + ' ' + (y.q || '') + ' ' + (y.s || '')))) if (tw.has(wq)) sc += 2; for (const wa of new Set(words(x.a + ' ' + (y.a || '')))) if (tw.has(wa)) sc += 0.5; if (sc > bs) { bs = sc; best = i + 1; } });
    return bs >= 2 ? best : 0; }
  w.RASITI_FAQ = {seller, buyer, ussd, chatList, chatAnswer, match, count:set => SETS[set].list.length};
})(typeof window !== 'undefined' ? window : globalThis);
