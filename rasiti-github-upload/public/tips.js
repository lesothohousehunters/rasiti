/* Daily education messages ("Tip of the day") for customers and sellers, in simple English and Sesotho.
   One source for the USSD server, the demo phones and the officer console.
   Facts come from RSL's public pages (see src on each tip). Sesotho is a draft: RSL staff should check it before the pilot.
   When RSL shares its own education resources, replace or add tips here: the list repeats every 33 days.
   How they reach people:
   - Free to read: a WhatsApp Channel post every day, and "Tip of the day" on the USSD and WhatsApp menus.
   Keep English tips under 155 characters so each fits in one SMS. */
(function (w) {
  const G = 'RSL Guide on Tax Registration', R = 'RSL website: Registration', P = 'RSL Guide on Tax Registration: payments';
  const T = [
    {for:'all', en:'Ask for a receipt every time you buy. Each Rasiti receipt is a free ticket in the monthly prize draw.', st:'Kopa rasiti nako le nako ha u reka. Rasiti e \'ngoe le e \'ngoe ke tekete ea mahala ea lotho ea khoeli.', src:'Rasiti'},
    {for:'seller', en:'Every business in Lesotho must register with RSL, even a small one. Registration is free.', st:'Khoebo e \'ngoe le e \'ngoe Lesotho e lokela ho ingolisa le RSL, le e nyane. Ho ingolisa ke mahala.', src:G},
    {for:'seller', en:'To register as a sole trader you need your trader\'s licence and a certified copy of your ID or passport.', st:'Ho ingolisa u hloka laesense ea khoebo le kopi e netefalitsoeng ea ID kapa phasepoto ea hau.', src:G},
    {for:'seller', en:'You can register at RSL Digital Service Centres in Maseru, Leribe and Mohale\'s Hoek, or online on RSL e-services.', st:'U ka ingolisa Litsing tsa Litšebeletso tsa Dijithale tsa RSL Maseru, Leribe le Mohale\'s Hoek, kapa inthaneteng.', src:G},
    {for:'seller', en:'Your TIN is your tax number. One TIN covers income tax, VAT and customs. Quote it on every tax form.', st:'TIN ke nomoro ea hau ea lekhetho. TIN e le \'ngoe e sebetsa bakeng sa lekhetho la chelete, VAT le meeli.', src:R},
    {for:'seller', en:'Keep a record of every sale and every cost: stock, rent, transport. Rasiti keeps your sales book for free.', st:'Ngola thekiso e \'ngoe le e \'ngoe le litšenyehelo tsohle: thepa, rente, lipalangoang. Rasiti e u bolokela buka ea thekiso mahala.', src:G},
    {for:'seller', en:'Keep receipts and slips for things you buy for your business. They show your real costs.', st:'Boloka lirasiti tsa lintho tseo u li rekelang khoebo. Li bontša litšenyehelo tsa hau tsa nnete.', src:G},
    {for:'seller', en:'You can pay tax with M-Pesa: dial *200#, then choose 1, then 5, then 9. Keep the reference.', st:'U ka lefa lekhetho ka M-Pesa: letsetsa *200#, ebe u khetha 1, 5, ebe 9. Boloka nomoro ea tefo.', src:P},
    {for:'seller', en:'You can also pay tax online with EcoCash or M-Pesa on RSL e-Payments, or at a bank.', st:'U ka boela ua lefa lekhetho inthaneteng ka EcoCash kapa M-Pesa ho RSL e-Payments, kapa bankeng.', src:P},
    {for:'seller', en:'Paid at a bank? Email the proof to receipts@rsl.org.ls to get your RSL receipt.', st:'U lefile bankeng? Romela bopaki ho receipts@rsl.org.ls ho fumana rasiti ea RSL.', src:P},
    {for:'seller', en:'Did not trade this quarter? File a nil return and give the reason. A nil return is not wrong.', st:'Ha ua rekisa kotareng ena? Romela tlaleho ea lefeela \'me u fane ka lebaka. Ha e fosahale.', src:'Rasiti'},
    {for:'seller', en:'Cannot pay in full? Pay a little each week before the due date. Small payments add up.', st:'Ha u khone ho lefa kaofela? Lefa hanyane beke le beke pele ho letsatsi. Litefo tse nyane lia eketseha.', src:'Rasiti'},
    {for:'seller', en:'Turn on Rasiti reminders: we send an SMS 3 days before each due date. Seller > 3 My tax > 4.', st:'Bulela likhopotso tsa Rasiti: re u romella SMS matsatsi a 3 pele ho letsatsi. Morekisi > 3 Lekhetho la ka > 4.', src:'Rasiti'},
    {for:'seller', en:'Moved your stall or changed your business name? Tell RSL in writing so your details stay correct.', st:'U fallisitse setala kapa u fetotse lebitso la khoebo? Bolella RSL ka lengolo hore lintlha tsa hau li nepahale.', src:G},
    {for:'seller', en:'Businesses with sales of M850,000 or more a year must register for VAT (RSL guide, 2024). Ask RSL if unsure.', st:'Likhoebo tse rekisang M850,000 kapa ho feta ka selemo li lokela ho ngolisetsa VAT (tataiso ea RSL, 2024). Botsa RSL.', src:G},
    {for:'seller', en:'VAT returns are due on the 20th of every month. Rasiti returns are once a quarter, due on the 20th after the quarter ends.', st:'Litlaleho tsa VAT li lokela ka la 20 khoeli le khoeli. Litlaleho tsa Rasiti ke hang ka kotara, li lokela ka la 20 kamora hore kotara e fele.', src:G},
    {for:'seller', en:'Registered sellers get double draw entries for their customers. More customers choose your stall.', st:'Barekisi ba ngolisitseng ba fumanela bareki ba bona menyetla e habeli. Bareki ba bangata ba khetha setala sa hau.', src:'Rasiti'},
    {for:'seller', en:'A TIN helps you get a bank loan or a tender. Registering opens doors for your business.', st:'TIN e u thusa ho fumana kalimo bankeng kapa thendara. Ho ingolisa ho bula menyako ea khoebo ea hau.', src:'Rasiti'},
    {for:'all', en:'Need help with tax? Call RSL free on 8002 2009, or WhatsApp +266 6221 0090.', st:'U hloka thuso ka lekhetho? Letsetsa RSL mahala ho 8002 2009, kapa WhatsApp +266 6221 0090.', src:R},
    {for:'all', en:'RSL is at Finance House, Government Office Complex, Kingsway Road, Maseru. Email info@rsl.org.ls.', st:'RSL e Finance House, Government Office Complex, Kingsway Road, Maseru. Email info@rsl.org.ls.', src:R},
    {for:'all', en:'Check a receipt before you trust it: Customer > 3 Check a receipt. Fake codes are reported to RSL.', st:'Hlahloba rasiti pele u e tšepa: Moreki > 3 Hlahloba rasiti. Likhoutu tsa bohata li tlalehoa ho RSL.', src:'Rasiti'},
    {for:'all', en:'Rasiti and RSL never ask for your PIN or money to pay a prize. Anyone who does is a scammer.', st:'Rasiti le RSL ha li kope PIN kapa chelete ho lefa moputso. Ea etsang joalo ke lesholu.', src:'Rasiti'},
    {for:'all', en:'Taxes pay for schools, clinics and roads. Asking for a receipt helps build Lesotho.', st:'Lekhetho le lefella likolo, litliliniki le litsela. Ho kopa rasiti ho thusa ho aha Lesotho.', src:'Rasiti'},
    {for:'all', en:'Shop gave no receipt? Rate it: Customer > 4. Your name is never shown. RSL acts only when many say the same.', st:'Lebenkele ha le a fana ka rasiti? Le lekanye: Moreki > 4. Lebitso la hau ha le bontšoe.', src:'Rasiti'},
    {for:'all', en:'Paying by M-Pesa or EcoCash at a Rasiti seller? Pay as usual. Your receipt and draw entries come by SMS by themselves.', st:'U lefa ka M-Pesa kapa EcoCash ho morekisi oa Rasiti? Lefa joalo ka kamehla. Rasiti le menyetla ea lotho li tla ka SMS ka bo tsona.', src:'Rasiti'},
    {for:'all', en:'Paid by card at a Rasiti shop? Dial *999#, choose Customer, then 2, and enter the seller code, the amount and the last 4 digits of your card within 3 days.', st:'U lefile ka karete lebenkeleng la Rasiti? Letsetsa *999#, khetha Moreki, ebe 2, u kenye khoutu ea morekisi, chelete le linomoro tse 4 tsa ho qetela tsa karete nakong ea matsatsi a 3.', src:'Rasiti'},
    {for:'all', en:'Paid cash at a Rasiti shop? Dial *999#, choose Customer, then 1, and enter the seller code and the amount. You get your receipt when the seller confirms.', st:'U lefile ka kheshe lebenkeleng la Rasiti? Letsetsa *999#, khetha Moreki, ebe 1, u kenye khoutu ea morekisi le chelete. U tla fumana rasiti ha morekisi a netefatsa.', src:'Rasiti'},
    {for:'seller', en:'Customers who paid cash ask for a receipt on *999#. Confirm only real sales: Seller > 1. Each one goes into your sales book, ready for filing.', st:'Bareki ba lefileng ka kheshe ba kopa rasiti ho *999#. Netefatsa feela lithekiso tsa nnete: Morekisi > 1. E \'ngoe le e \'ngoe e kena bukeng ea hau ea thekiso.', src:'Rasiti'},
    {for:'seller', en:'Using a false TIN is a crime. Your TIN is personal: do not share it with others to use.', st:'Ho sebelisa TIN ea bohata ke tlolo ea molao. TIN ea hau ke ea hau: u se ke ua e fa ba bang.', src:R},
    {for:'seller', en:'Not registering for tax is an offence and can lead to fines. Register early: it is free and simple.', st:'Ho se ingolise bakeng sa lekhetho ke tlolo ea molao \'me ho ka tlisa likotlo. Ingolise kapele: ke mahala.', src:R},
    {for:'seller', en:'RSL Taxpayer Education and the One Stop Business Facilitation Centre (OBFC) can help you register.', st:'Thuto ea Balefi ba Lekhetho ea RSL le OBFC ba ka u thusa ho ingolisa.', src:G},
    {for:'seller', en:'Hired a worker? Ask RSL about PAYE: tax taken from salaries is due on the 15th of each month.', st:'U hirile mosebetsi? Botsa RSL ka PAYE: lekhetho la meputso le lokela ka la 15 khoeli le khoeli.', src:G},
    {for:'all', en:'Tell a friend about Rasiti: free receipts, free draw entries, and fair trade for honest sellers.', st:'Bolella motsoalle ka Rasiti: lirasiti tsa mahala, menyetla ea mahala, le khoebo e hlokang leeme.', src:'Rasiti'}
  ];
  const DAY = 86400000;
  const dayIndex = d => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / DAY);
  function forDate(d, who) { const list = who ? T.filter(t => t.for === 'all' || t.for === who) : T; return list[dayIndex(d || new Date()) % list.length]; }
  function text(t, lang) { return lang === 'st' ? t.st : t.en; }
  // Next n days, for the officer console schedule.
  function schedule(from, n) { const out = []; for (let i = 0; i < n; i++) { const d = new Date((from || new Date()).getTime() + i * DAY); out.push({ date: d, tip: forDate(d) }); } return out; }
  w.RASITI_TIPS = { list: T, forDate, text, schedule };
})(typeof window !== 'undefined' ? window : globalThis);
