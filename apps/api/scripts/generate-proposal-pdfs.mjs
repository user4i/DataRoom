import { createRequire } from 'module';
import { mkdir, writeFile, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb, degrees } from 'pdf-lib';

const require = createRequire(import.meta.url);
const fontkit = require('@pdf-lib/fontkit');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(__dirname, 'fonts');
const OUT_DIR = path.join(__dirname, '..', 'fixtures', 'proposals');

const A4 = [595.28, 841.89];
const INK = rgb(0.12, 0.12, 0.14);
const SCAN_INK = rgb(0.22, 0.2, 0.18);
const MUTED = rgb(0.38, 0.38, 0.4);
const RULE = rgb(0.72, 0.72, 0.74);
const WHITE = rgb(1, 1, 1);
const SCAN_PAPER = rgb(0.93, 0.91, 0.85);
const GREEN = rgb(0.16, 0.38, 0.24);
const NAVY = rgb(0.12, 0.2, 0.38);
const RED = rgb(0.55, 0.12, 0.12);
const STAMP_RED = rgb(0.7, 0.15, 0.12);

const docs = [
  {
    file: 'Green-Valley-offer-2026-04-12.pdf',
    layout: 'letter',
    scan: false,
    company: 'GREEN VALLEY PRODUCE LTD',
    address: 'Station Road 14, Kent, UK',
    supplier: 'Green Valley Produce Ltd',
    dateLabel: 'Proposal date',
    date: '12 April 2026',
    ref: 'Offer No. GV-2026-0412',
    intro: 'Dear buyer, we propose the following fruits and vegetables for week 16.',
    headers: ['Item', 'List price', 'Quantity', 'Sum'],
    items: [
      ['Royal Gala apples', 'EUR 1.20 / kg', '800 kg', 'EUR 960.00'],
      ['Conference pears', 'EUR 1.45 / kg', '400 kg', 'EUR 580.00'],
      ['Iceberg lettuce', 'EUR 0.55 / head', '1 200 heads', 'EUR 660.00'],
      ['Cherry tomatoes', 'EUR 2.10 / kg', '250 kg', 'EUR 525.00'],
    ],
    total: 'Total  EUR 2,725.00',
    footer: 'Valid until 19 April 2026. FCA Kent. Honest grower offer, no agent.',
  },
  {
    file: 'Delta-Fresh-quote-Q-441.pdf',
    layout: 'invoice',
    scan: false,
    company: 'DELTA FRESH B.V.',
    address: 'Handelsweg 8, Barendrecht, NL',
    supplier: 'Delta Fresh B.V.',
    dateLabel: 'Proposal date',
    date: '28 February 2026',
    ref: 'Quotation Q-441',
    intro: 'Fruits and vegetables order proposal. Prices are list prices, packed, EXW Barendrecht.',
    headers: ['Item', 'List price', 'Quantity', 'Sum'],
    items: [
      ['Conference pears 60-65', 'EUR 1.38 / kg', '1 200 kg', 'EUR 1,656.00'],
      ['Elstar apples', 'EUR 0.98 / kg', '2 000 kg', 'EUR 1,960.00'],
      ['Cucumber 400 g', 'EUR 0.42 / pc', '5 000 pcs', 'EUR 2,100.00'],
      ['Red bell pepper', 'EUR 1.85 / kg', '600 kg', 'EUR 1,110.00'],
    ],
    total: 'Sum  EUR 6,826.00',
    footer: 'Payment 14 days. Quote valid 5 working days.',
  },
  {
    file: 'Noord-Groente-pricelist-W12.pdf',
    layout: 'pricelist',
    scan: false,
    company: 'NOORD GROENTE',
    address: 'Veilingstraat 2, Zwaagdijk, NL',
    supplier: 'Noord Groente Cooperatie',
    dateLabel: 'Proposal date',
    date: '16 March 2026 (week 12)',
    ref: 'Weekly price list W12',
    intro: 'Grower price list — fruits and vegetables. Order before Thursday 12:00.',
    headers: ['Product', 'List price', 'Qty offered', 'Sum'],
    items: [
      ['Iceberg lettuce', 'EUR 0.48 / head', '3 000 heads', 'EUR 1,440.00'],
      ['Butterhead lettuce', 'EUR 0.39 / head', '2 400 heads', 'EUR 936.00'],
      ['Spring onion', 'EUR 0.85 / bunch', '1 800 bunches', 'EUR 1,530.00'],
      ['White cabbage', 'EUR 0.32 / kg', '4 000 kg', 'EUR 1,280.00'],
      ['Carrot washed 5 kg', 'EUR 0.55 / kg', '2 500 kg', 'EUR 1,375.00'],
    ],
    total: 'List sum  EUR 6,561.00',
    footer: 'Members only. No intermediaries on this sheet.',
  },
  {
    file: 'Iberia-Citrus-weekly-2026-03-09.pdf',
    layout: 'banner',
    scan: false,
    company: 'IBERIA CITRUS S.L.',
    address: 'Partida El Palmeral, Castellon, ES',
    supplier: 'Iberia Citrus S.L.',
    dateLabel: 'Proposal date',
    date: '9 March 2026',
    ref: 'Weekly citrus & produce 09/03',
    intro: 'Export proposal. Fruit and selected vegetables, packed 15 kg cartons unless noted.',
    headers: ['Item', 'List price', 'Quantity', 'Sum'],
    items: [
      ['Navel oranges 6/7', 'EUR 0.72 / kg', '18 000 kg', 'EUR 12,960.00'],
      ['Clementines 1X', 'EUR 0.95 / kg', '8 000 kg', 'EUR 7,600.00'],
      ['Lemons Verna', 'EUR 0.88 / kg', '4 500 kg', 'EUR 3,960.00'],
      ['Courgette dark', 'EUR 1.10 / kg', '2 000 kg', 'EUR 2,200.00'],
    ],
    total: 'Proposal sum  EUR 26,720.00',
    footer: 'FOB Castellon. Phytosanitary certificate included.',
  },
  {
    file: 'Green-Valley-offer-SCAN-2026-01-20.pdf',
    layout: 'letter',
    scan: true,
    stamp: 'SCANNED\n20 JAN 2026',
    company: 'GREEN VALLEY PRODUCE LTD',
    address: 'Station Road 14, Kent, UK',
    supplier: 'Green Valley Produce Ltd',
    dateLabel: 'Proposal date',
    date: '20 January 2026',
    ref: 'Offer No. GV-2026-0120 (photocopy)',
    intro: 'Scanned copy of the signed grower proposal. Contents unchanged from the paper original.',
    headers: ['Item', 'List price', 'Quantity', 'Sum'],
    items: [
      ['Bramley apples', 'EUR 0.90 / kg', '1 100 kg', 'EUR 990.00'],
      ['Conference pears', 'EUR 1.30 / kg', '350 kg', 'EUR 455.00'],
      ['Savoy cabbage', 'EUR 0.40 / kg', '900 kg', 'EUR 360.00'],
    ],
    total: 'Total  EUR 1,805.00',
    footer: 'Original signed in Kent. This is a scan for the data room.',
  },
  {
    file: 'Delta-warehouse-note-SCAN.pdf',
    layout: 'invoice',
    scan: true,
    stamp: 'WAREHOUSE\nCOPY',
    company: 'DELTA FRESH  —  warehouse note',
    address: 'Dock 3, Barendrecht',
    supplier: 'Delta Fresh B.V.',
    dateLabel: 'Proposal date',
    date: '04 February 2026',
    ref: 'WH-note / proposal 04-02',
    intro: 'Hand-stamped warehouse photocopy. Order proposal as counted on the dock.',
    headers: ['Item', 'List price', 'Quantity', 'Sum'],
    items: [
      ['Tomato vine', 'EUR 1.55 / kg', '740 kg', 'EUR 1,147.00'],
      ['Cucumber 400 g', 'EUR 0.40 / pc', '2 200 pcs', 'EUR 880.00'],
      ['Iceberg', 'EUR 0.50 / head', '900 heads', 'EUR 450.00'],
    ],
    total: 'Sum  EUR 2,477.00',
    footer: 'Scan quality: grey, slightly skewed. Still a valid Delta proposal.',
  },
  {
    file: 'Baltic-Trade-Hub-agent-offer.pdf',
    layout: 'agent',
    scan: false,
    company: 'BALTIC TRADE HUB',
    address: 'Agent desk, Klaipeda LT — acting for Noord Groente',
    supplier: 'Noord Groente Cooperatie (seller) / Baltic Trade Hub (agent)',
    dateLabel: 'Proposal date',
    date: '21 March 2026',
    ref: 'Agent offer BTH-21-03',
    intro: 'We act as disclosed intermediary. Grower list prices below; our agency fee is 5% on the sum, shown separately.',
    headers: ['Item', 'List price', 'Quantity', 'Sum'],
    items: [
      ['Iceberg lettuce', 'EUR 0.48 / head', '3 000 heads', 'EUR 1,440.00'],
      ['Carrot washed', 'EUR 0.55 / kg', '2 500 kg', 'EUR 1,375.00'],
      ['White cabbage', 'EUR 0.32 / kg', '4 000 kg', 'EUR 1,280.00'],
    ],
    total: 'Goods  EUR 4,095.00    Agency 5%  EUR 204.75    Payable  EUR 4,299.75',
    footer: 'Honest disclosed agent. Principal: Noord Groente. No dual pricing.',
  },
  {
    file: 'EuroBest-Produce-special.pdf',
    layout: 'letter',
    scan: false,
    shady: true,
    company: 'EUROBEST PRODUCE GROUP',
    address: 'Virtual office, Cyprus mailbox 441',
    supplier: 'Green Valley Produce Ltd (claimed — not verified)',
    dateLabel: 'Proposal date',
    date: '12 April 2026',
    ref: '“Special” offer EB-99  (same date as genuine GV offer)',
    intro: 'Urgent lot. Do not call the farm. Pay the agent account on page 2 (missing). Letterhead does not match the named supplier.',
    headers: ['Item', 'List price', 'Quantity', 'Sum'],
    items: [
      ['Royal Gala apples', 'EUR 1.20 / kg', '800 kg', 'EUR 960.00'],
      ['Conference pears', 'EUR 1.45 / kg', '400 kg', 'EUR 580.00'],
      ['Iceberg lettuce', 'EUR 0.55 / head', '1 200 heads', 'EUR 660.00'],
      ['Cherry tomatoes', 'EUR 2.10 / kg', '250 kg', 'EUR 525.00'],
    ],
    total: 'TOTAL AS INVOICED  EUR 4,180.00   (line items only add to EUR 2,725.00)',
    footer: 'Cash preferred. “Ignore the arithmetic, we rounded for handling.” Unscrupulous markup on a copied grower list.',
  },
  {
    file: 'AgroLink-resale-SCAN.pdf',
    layout: 'reseller',
    scan: true,
    stamp: 'SCAN\n#2',
    company: 'AGROLINK GmbH  —  reseller',
    address: 'Hamburg cold store, gate B',
    supplier: 'AgroLink GmbH (intermediary); origin mixed: Iberia Citrus + Delta Fresh',
    dateLabel: 'Proposal date',
    date: '11 March 2026',
    ref: 'Resale lot AL-H-11',
    intro: 'Scanned reseller sheet. Two origins mixed on one proposal. Agent does not grow produce.',
    headers: ['Item', 'List price', 'Quantity', 'Sum'],
    items: [
      ['Navel oranges (ES)', 'EUR 0.99 / kg', '6 000 kg', 'EUR 5,940.00'],
      ['Elstar apples (NL)', 'EUR 1.25 / kg', '1 400 kg', 'EUR 1,750.00'],
      ['Cucumber (NL)', 'EUR 0.55 / pc', '3 000 pcs', 'EUR 1,650.00'],
    ],
    total: 'Resale sum  EUR 9,340.00',
    footer: 'Origin split is disclosed. Prices are reseller list, not grower list.',
  },
  {
    file: 'Kent-Orchards-fax-SCAN.pdf',
    layout: 'fax',
    scan: true,
    stamp: 'FAX OK',
    company: 'KENT ORCHARDS',
    address: 'Fax: +44 1732 55 01 19',
    supplier: 'Kent Orchards Ltd',
    dateLabel: 'Proposal date',
    date: '02 January 2026',
    ref: 'FAX 02-JAN-26  07:41',
    intro: 'Faxed fruit proposal (scan of thermal paper). Dark edges, low contrast.',
    headers: ['Item', 'List price', 'Quantity', 'Sum'],
    items: [
      ['Cox apples', 'GBP 0.85 / kg', '600 kg', 'GBP 510.00'],
      ['Conference pears', 'GBP 1.10 / kg', '280 kg', 'GBP 308.00'],
      ['Plums late', 'GBP 1.40 / kg', '150 kg', 'GBP 210.00'],
    ],
    total: 'Sum  GBP 1,028.00',
    footer: 'If unreadable, call the orchard. This is the original fax scan.',
  },
  {
    file: 'CashLot-no-VAT-SCAN.pdf',
    layout: 'plain',
    scan: true,
    shady: true,
    stamp: 'CASH',
    company: 'cash lot  —  no company paper',
    address: 'Lay-by, A2, unnamed van',
    supplier: 'M.K. (private, no registration given)',
    dateLabel: 'Proposal date',
    date: 'night of 8 March 2026',
    ref: 'verbal / this scan only',
    intro: 'Unscrupulous cash lot. No VAT, no lot numbers, no returns. Prices far below market.',
    headers: ['Item', 'List price', 'Quantity', 'Sum'],
    items: [
      ['Apples mixed (unlabelled)', 'EUR 0.35 / kg', '2 200 kg', 'EUR 770.00'],
      ['Tomatoes (soft)', 'EUR 0.40 / kg', '900 kg', 'EUR 360.00'],
      ['Cabbage', 'EUR 0.12 / kg', '1 000 kg', 'EUR 120.00'],
    ],
    total: 'Cash only  EUR 1,000.00  (asked; lines add to EUR 1,250.00 — “discount if no invoice”)',
    footer: 'Do not email. Pay in notes on collection. Likely stolen or dumped stock.',
  },
  {
    file: 'Horizon-Coop-week16.pdf',
    layout: 'banner',
    scan: false,
    company: 'HORIZON GROWERS CO-OP',
    address: 'Member packing station, Lincolnshire',
    supplier: 'Horizon Growers Co-op',
    dateLabel: 'Proposal date',
    date: '13 April 2026',
    ref: 'Co-op week 16 list',
    intro: 'Direct growers’ co-operative. No intermediary. Fruits and vegetables as packed this Monday.',
    headers: ['Item', 'List price', 'Quantity', 'Sum'],
    items: [
      ['Gala apples bagged', 'GBP 1.05 / kg', '3 200 kg', 'GBP 3,360.00'],
      ['Strawberries punnet', 'GBP 2.40 / kg', '800 kg', 'GBP 1,920.00'],
      ['Asparagus green', 'GBP 4.10 / kg', '220 kg', 'GBP 902.00'],
      ['New potatoes', 'GBP 0.62 / kg', '5 000 kg', 'GBP 3,100.00'],
    ],
    total: 'Co-op sum  GBP 9,282.00',
    footer: 'Members voted these list prices. FCA Lincolnshire.',
  },
  {
    file: 'Mediator-markup-SCAN.pdf',
    layout: 'reseller',
    scan: true,
    shady: true,
    stamp: 'COPY',
    company: 'FARMGATE BROKERS LTD',
    address: '“On behalf of several farms” — farms not named',
    supplier: 'FarmGate Brokers Ltd (undisclosed intermediary)',
    dateLabel: 'Proposal date',
    date: '18 March 2026',
    ref: 'Broker sheet FG-18  (scan)',
    intro: 'Unscrupulous mediator. Grower list is hidden. Handling fee is not a percentage — it is folded into quantity.',
    headers: ['Item', 'List price', 'Quantity', 'Sum'],
    items: [
      ['Gala apples', 'EUR 1.05 / kg', '3 200 kg shown / 2 400 kg real', 'EUR 3,360.00 on 3 200 kg'],
      ['New potatoes', 'EUR 0.70 / kg', '5 000 kg shown / 4 200 kg real', 'EUR 3,500.00 on 5 000 kg'],
      ['Asparagus', 'EUR 6.50 / kg', '220 kg', 'EUR 1,430.00'],
    ],
    total: 'Invoiced  EUR 12,900.00  (lines as printed ~ EUR 8,290.00; extra is silent markup)',
    footer: 'If the farm is asked, they never issued this sheet. Scan of a broker photocopy.',
  },
  {
    file: 'Iberia-copy-stamp-SCAN.pdf',
    layout: 'banner',
    scan: true,
    stamp: 'COPY\nNOT ORIGINAL',
    company: 'IBERIA CITRUS S.L.',
    address: 'Partida El Palmeral, Castellon, ES',
    supplier: 'Iberia Citrus S.L.',
    dateLabel: 'Proposal date',
    date: '9 March 2026',
    ref: 'COPY of weekly 09/03 — stamp on scan',
    intro: 'Office photocopy of the citrus weekly, then scanned. Same goods as the clean weekly file.',
    headers: ['Item', 'List price', 'Quantity', 'Sum'],
    items: [
      ['Navel oranges 6/7', 'EUR 0.72 / kg', '18 000 kg', 'EUR 12,960.00'],
      ['Clementines 1X', 'EUR 0.95 / kg', '8 000 kg', 'EUR 7,600.00'],
    ],
    total: 'Copy sum  EUR 20,560.00  (partial copy: lemons/courgette pages missing)',
    footer: 'Incomplete scan — last two lines of the original weekly are cut off.',
  },
  {
    file: 'Twin-count-offer-SCAN.pdf',
    layout: 'invoice',
    scan: true,
    shady: true,
    stamp: 'REVISED',
    company: 'TWIN COUNT TRADING',
    address: 'Same pallet counted twice',
    supplier: 'Twin Count Trading Ltd',
    dateLabel: 'Proposal date',
    date: '25 March 2026',
    ref: 'Proposal TC-25  (scan of “revised” sheet)',
    intro: 'Unscrupulous double count. The same Elstar lot appears twice. Quantity in the warehouse is 2 000 kg, not 4 000 kg.',
    headers: ['Item', 'List price', 'Quantity', 'Sum'],
    items: [
      ['Elstar apples (lot A)', 'EUR 0.98 / kg', '2 000 kg', 'EUR 1,960.00'],
      ['Elstar apples (lot A again)', 'EUR 0.98 / kg', '2 000 kg', 'EUR 1,960.00'],
      ['Conference pears', 'EUR 1.38 / kg', '1 200 kg', 'EUR 1,656.00'],
    ],
    total: 'Claimed sum  EUR 5,576.00   (honest count would be EUR 3,616.00)',
    footer: 'Scan shows a handwritten “revised” over an earlier figure. Do not pay the duplicate line.',
  },
  {
    file: 'AgroSmak-proposal-88-03.pdf',
    layout: 'ukInvoice',
    scan: false,
    company: 'ТОВ «АгроСмак»',
    address: 'вул. Балківська 12, Одеса',
    supplier: 'ТОВ «АгроСмак»',
    dateLabel: 'Дата пропозиції',
    date: '03.03.2026',
    ref: 'КОМЕРЦІЙНА ПРОПОЗИЦІЯ № 88/03',
    intro: 'Пропозиція на фрукти та овочі. Ціни — прайс постачальника, без посередника.',
    headers: ['Назва', 'Ціна за од.', 'К-сть', 'Сума'],
    items: [
      ['Картопля молода', '12.50 грн/кг', '2 000 кг', '25 000.00 грн'],
      ['Морква мита', '9.80 грн/кг', '800 кг', '7 840.00 грн'],
      ['Яблука Голден', '18.00 грн/кг', '1 500 кг', '27 000.00 грн'],
      ['Огірки тепличні', '32.00 грн/кг', '300 кг', '9 600.00 грн'],
    ],
    total: 'Разом: 69 440.00 грн',
    footer: 'Умови: FCA Одеса, оплата протягом 7 днів.',
  },
  {
    file: 'FG-Sadok-SCAN.pdf',
    layout: 'ukInvoice',
    scan: true,
    stamp: 'СКАНОВАНО',
    company: 'ФГ «Садок»',
    address: 'с. Степове, Вінницька обл.',
    supplier: 'ФГ «Садок»',
    dateLabel: 'Дата пропозиції',
    date: '14.02.2026',
    ref: 'Пропозиція № 14/02  (скан з печатки)',
    intro: 'Скан паперової пропозиції господарства. Фрукти та овочі з поля.',
    headers: ['Назва', 'Ціна за од.', 'К-сть', 'Сума'],
    items: [
      ['Яблука Чемпіон', '16.00 грн/кг', '4 000 кг', '64 000.00 грн'],
      ['Груша Лісова красуня', '22.00 грн/кг', '600 кг', '13 200.00 грн'],
      ['Буряк столовий', '8.50 грн/кг', '1 200 кг', '10 200.00 грн'],
      ['Капуста білоголова', '7.20 грн/кг', '1 800 кг', '12 960.00 грн'],
    ],
    total: 'Разом: 100 360.00 грн',
    footer: 'Скан зроблено на МФУ, тінь зліва. Печатка ФГ на останньому рядку.',
  },
  {
    file: 'Logistic-Plus-agent.pdf',
    layout: 'ukAgent',
    scan: false,
    company: 'ТОВ «Логістик-Плюс»',
    address: 'Одеса, митний термінал — агент ФГ «Садок»',
    supplier: 'ФГ «Садок» (продавець) / ТОВ «Логістик-Плюс» (агент)',
    dateLabel: 'Дата пропозиції',
    date: '18.02.2026',
    ref: 'Агентська пропозиція ЛП-18/02',
    intro: 'Посередник розкритий. Ціни господарства, комісія агента 8% окремим рядком.',
    headers: ['Назва', 'Ціна за од.', 'К-сть', 'Сума'],
    items: [
      ['Яблука Чемпіон', '16.00 грн/кг', '4 000 кг', '64 000.00 грн'],
      ['Капуста білоголова', '7.20 грн/кг', '1 800 кг', '12 960.00 грн'],
    ],
    total: 'Товар 76 960.00 грн    Комісія 8%  6 156.80 грн    До сплати  83 116.80 грн',
    footer: 'Добросовісний агент. Принципал: ФГ «Садок».',
  },
  {
    file: 'Shid-Produkt-overcharge.pdf',
    layout: 'ukInvoice',
    scan: false,
    shady: true,
    company: 'ТОВ «Схід-Продукт»',
    address: 'Харків, орендована юрадреса',
    supplier: 'ТОВ «АгроСмак» (заявлено, ЄДРПОУ не збігається з шапкою)',
    dateLabel: 'Дата пропозиції',
    date: '03.03.2026',
    ref: 'КП № 88/03-Д  (підроблена копія АгроСмак)',
    intro: 'Недобросовісна націнка. Скопійовані позиції АгроСмак, інша шапка, інша сума.',
    headers: ['Назва', 'Ціна за од.', 'К-сть', 'Сума'],
    items: [
      ['Картопля молода', '12.50 грн/кг', '2 000 кг', '25 000.00 грн'],
      ['Морква мита', '9.80 грн/кг', '800 кг', '7 840.00 грн'],
      ['Яблука Голден', '18.00 грн/кг', '1 500 кг', '27 000.00 грн'],
      ['Огірки тепличні', '32.00 грн/кг', '300 кг', '9 600.00 грн'],
    ],
    total: 'Разом до сплати: 112 000.00 грн  (рядки дають 69 440.00 грн)',
    footer: 'Оплата на картку фізособи. «Різниця — логістика.» Не збігається з ТОВ «АгроСмак».',
  },
  {
    file: 'Broker-Odesa-SCAN.pdf',
    layout: 'ukAgent',
    scan: true,
    shady: true,
    stamp: 'СЕКОНД',
    company: 'ФОП «Швидка поставка»',
    address: 'Одеса, без складу (скан з месенджера)',
    supplier: 'не названий посередник / товар нібито з ТОВ «АгроСмак»',
    dateLabel: 'Дата пропозиції',
    date: '05.03.2026',
    ref: 'Скан пересилки з Viber',
    intro: 'Недобросовісний посередник. Комісія «обов’язкова 40%». Постачальник у шапці не той, що в полі постачальника.',
    headers: ['Назва', 'Ціна за од.', 'К-сть', 'Сума'],
    items: [
      ['Картопля молода', '18.00 грн/кг', '2 000 кг', '36 000.00 грн'],
      ['Яблука Голден', '28.00 грн/кг', '1 500 кг', '42 000.00 грн'],
    ],
    total: 'До сплати  109 200.00 грн  (в т.ч. «комісія 40%», не розкрита в рядках)',
    footer: 'Скан низької якості. Реквізити АгроСмак підчищені маркером.',
  },
];

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashName(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i += 1) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function wrap(font, text, size, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawSpeckles(page, rng, width, height) {
  for (let i = 0; i < 420; i += 1) {
    const g = 0.45 + rng() * 0.4;
    page.drawCircle({
      x: rng() * width,
      y: rng() * height,
      size: rng() < 0.85 ? 0.4 : 1.1,
      color: rgb(g, g * 0.96, g * 0.9),
      opacity: 0.35,
    });
  }
}

function drawScanEdges(page, width, height) {
  page.drawRectangle({ x: 0, y: 0, width, height: 18, color: rgb(0.55, 0.52, 0.48), opacity: 0.25 });
  page.drawRectangle({ x: 0, y: height - 22, width, height: 22, color: rgb(0.5, 0.48, 0.44), opacity: 0.22 });
  page.drawRectangle({ x: 0, y: 0, width: 16, height, color: rgb(0.4, 0.38, 0.35), opacity: 0.18 });
}

function drawStamp(page, font, text, x, y) {
  const lines = text.split('\n');
  page.drawEllipse({
    x: x + 36,
    y: y + 10,
    xScale: 52,
    yScale: 28,
    borderColor: STAMP_RED,
    borderWidth: 1.6,
    opacity: 0.85,
    rotate: degrees(-12),
  });
  lines.forEach((line, i) => {
    page.drawText(line, {
      x,
      y: y + 14 - i * 11,
      size: 9,
      font,
      color: STAMP_RED,
      rotate: degrees(-12),
      opacity: 0.85,
    });
  });
}

function ink(scan) {
  return scan ? SCAN_INK : INK;
}

function drawTable(page, font, bold, spec, x, y, width) {
  const color = ink(spec.scan);
  const cols = [0, 0.42, 0.64, 0.8].map((p) => x + width * p);
  const size = spec.scan ? 8.5 : 9;
  spec.headers.forEach((h, i) => {
    page.drawText(h, { x: cols[i], y, size, font: bold, color });
  });
  page.drawLine({
    start: { x, y: y - 4 },
    end: { x: x + width, y: y - 4 },
    thickness: 0.7,
    color: spec.shady ? RED : RULE,
  });
  let rowY = y - 20;
  for (const row of spec.items) {
    row.forEach((cell, i) => {
      const lines = wrap(font, cell, size, i === 0 ? width * 0.4 : width * 0.18);
      lines.forEach((line, li) => {
        page.drawText(line, { x: cols[i], y: rowY - li * 11, size, font, color });
      });
    });
    rowY -= 28;
  }
  return rowY;
}

function drawMeta(page, font, bold, spec, x, y, maxWidth) {
  const color = ink(spec.scan);
  const supplierTag = spec.dateLabel === 'Дата пропозиції' ? 'Постачальник' : 'Supplier';
  page.drawText(`${supplierTag}: ${spec.supplier}`, { x, y, size: 10, font: bold, color });
  const dateLine = `${spec.dateLabel}: ${spec.date}`;
  page.drawText(dateLine, { x, y: y - 16, size: 10, font, color });
  page.drawText(spec.ref, { x, y: y - 32, size: 9, font, color: spec.shady ? RED : MUTED });
  let cursor = y - 54;
  for (const line of wrap(font, spec.intro, 10, maxWidth)) {
    page.drawText(line, { x, y: cursor, size: 10, font, color });
    cursor -= 14;
  }
  return cursor - 8;
}

function finish(page, font, spec, x, y, width) {
  const color = ink(spec.scan);
  page.drawText(spec.total, { x, y, size: 11, font, color: spec.shady ? RED : color });
  let cursor = y - 22;
  for (const line of wrap(font, spec.footer, 9, width)) {
    page.drawText(line, { x, y: cursor, size: 9, font, color: MUTED });
    cursor -= 12;
  }
}

function paintBackground(page, spec, width, height, rng) {
  if (spec.scan) {
    page.drawRectangle({ x: 0, y: 0, width, height, color: SCAN_PAPER });
    drawSpeckles(page, rng, width, height);
    drawScanEdges(page, width, height);
  } else {
    page.drawRectangle({ x: 0, y: 0, width, height, color: WHITE });
  }
}

function layoutLetter(page, font, bold, spec, width, height) {
  const color = ink(spec.scan);
  page.drawText(spec.company, { x: 48, y: height - 64, size: 16, font: bold, color });
  page.drawText(spec.address, { x: 48, y: height - 80, size: 9, font, color: MUTED });
  page.drawLine({ start: { x: 48, y: height - 92 }, end: { x: width - 48, y: height - 92 }, thickness: 1, color: GREEN });
  let y = drawMeta(page, font, bold, spec, 48, height - 120, width - 96);
  y = drawTable(page, font, bold, spec, 48, y, width - 96);
  finish(page, bold, spec, 48, y - 8, width - 96);
}

function layoutInvoice(page, font, bold, spec, width, height) {
  const color = ink(spec.scan);
  page.drawRectangle({ x: 40, y: 48, width: width - 80, height: height - 96, borderColor: spec.shady ? RED : NAVY, borderWidth: 1.2 });
  page.drawText(spec.company, { x: 56, y: height - 80, size: 14, font: bold, color: spec.shady ? RED : NAVY });
  page.drawText(spec.address, { x: 56, y: height - 96, size: 9, font, color: MUTED });
  let y = drawMeta(page, font, bold, spec, 56, height - 128, width - 112);
  y = drawTable(page, font, bold, spec, 56, y, width - 112);
  finish(page, bold, spec, 56, y - 8, width - 112);
}

function layoutPricelist(page, font, bold, spec, width, height) {
  page.drawRectangle({ x: 0, y: height - 36, width, height: 36, color: rgb(0.15, 0.15, 0.16) });
  page.drawText(`${spec.company}   ·   ${spec.ref}`, { x: 36, y: height - 24, size: 11, font: bold, color: WHITE });
  page.drawText(spec.address, { x: 36, y: height - 56, size: 9, font, color: MUTED });
  let y = drawMeta(page, font, bold, spec, 36, height - 84, width - 72);
  y = drawTable(page, font, bold, spec, 36, y, width - 72);
  finish(page, bold, spec, 36, y - 6, width - 72);
}

function layoutBanner(page, font, bold, spec, width, height) {
  page.drawRectangle({ x: 0, y: height - 88, width, height: 88, color: GREEN });
  page.drawText(spec.company, { x: 40, y: height - 48, size: 18, font: bold, color: WHITE });
  page.drawText(spec.address, { x: 40, y: height - 68, size: 9, font, color: rgb(0.85, 0.92, 0.86) });
  let y = drawMeta(page, font, bold, spec, 40, height - 120, width - 80);
  y = drawTable(page, font, bold, spec, 40, y, width - 80);
  finish(page, bold, spec, 40, y - 8, width - 80);
}

function layoutFax(page, font, bold, spec, width, height) {
  const color = ink(true);
  page.drawText('FAX MESSAGE', { x: 48, y: height - 56, size: 20, font: bold, color });
  const boxY = height - 150;
  page.drawRectangle({ x: 48, y: boxY, width: width - 96, height: 70, borderColor: INK, borderWidth: 0.8 });
  page.drawText(`FROM: ${spec.company}`, { x: 56, y: boxY + 48, size: 10, font: bold, color });
  page.drawText(`TO: Buying desk`, { x: 56, y: boxY + 32, size: 10, font, color });
  page.drawText(`DATE: ${spec.date}    ${spec.ref}`, { x: 56, y: boxY + 16, size: 9, font, color });
  let y = drawMeta(page, font, bold, spec, 48, boxY - 24, width - 96);
  y = drawTable(page, font, bold, spec, 48, y, width - 96);
  finish(page, bold, spec, 48, y - 8, width - 96);
}

function layoutPlain(page, font, bold, spec, width, height) {
  const color = ink(spec.scan);
  page.drawText(spec.company, { x: 64, y: height - 72, size: 13, font: bold, color });
  page.drawText(spec.address, { x: 64, y: height - 90, size: 9, font, color: MUTED });
  let y = drawMeta(page, font, bold, spec, 64, height - 120, width - 128);
  for (const row of spec.items) {
    page.drawText(`- ${row[0]}  |  ${row[1]}  |  ${row[2]}  |  ${row[3]}`, { x: 64, y, size: 9, font, color });
    y -= 22;
  }
  finish(page, bold, spec, 64, y - 10, width - 128);
}

function layoutAgent(page, font, bold, spec, width, height) {
  page.drawRectangle({ x: 40, y: height - 70, width: 8, height: 40, color: NAVY });
  page.drawText(spec.company, { x: 58, y: height - 48, size: 15, font: bold, color: NAVY });
  page.drawText('DISCLOSED INTERMEDIARY / АГЕНТ', { x: 58, y: height - 64, size: 8, font: bold, color: MUTED });
  page.drawText(spec.address, { x: 58, y: height - 88, size: 9, font, color: MUTED });
  let y = drawMeta(page, font, bold, spec, 48, height - 118, width - 96);
  y = drawTable(page, font, bold, spec, 48, y, width - 96);
  finish(page, bold, spec, 48, y - 8, width - 96);
}

function layoutReseller(page, font, bold, spec, width, height) {
  page.drawRectangle({ x: 36, y: height - 100, width: width - 72, height: 64, color: rgb(0.95, 0.93, 0.88), borderColor: RULE, borderWidth: 0.8 });
  page.drawText(spec.company, { x: 48, y: height - 58, size: 14, font: bold, color: ink(spec.scan) });
  page.drawText(spec.address, { x: 48, y: height - 76, size: 9, font, color: MUTED });
  let y = drawMeta(page, font, bold, spec, 48, height - 128, width - 96);
  y = drawTable(page, font, bold, spec, 48, y, width - 96);
  finish(page, bold, spec, 48, y - 8, width - 96);
}

function layoutUkInvoice(page, font, bold, spec, width, height) {
  const color = ink(spec.scan);
  page.drawText(spec.company, { x: 48, y: height - 56, size: 16, font: bold, color });
  page.drawText(spec.address, { x: 48, y: height - 72, size: 9, font, color: MUTED });
  page.drawLine({ start: { x: 48, y: height - 84 }, end: { x: width - 48, y: height - 84 }, thickness: 1.4, color: spec.shady ? RED : GREEN });
  page.drawText(spec.ref, { x: 48, y: height - 106, size: 12, font: bold, color });
  let y = drawMeta(page, font, bold, spec, 48, height - 136, width - 96);
  y = drawTable(page, font, bold, spec, 48, y, width - 96);
  finish(page, bold, spec, 48, y - 8, width - 96);
}

function layoutUkAgent(page, font, bold, spec, width, height) {
  page.drawRectangle({ x: 0, y: height - 52, width, height: 52, color: spec.shady ? rgb(0.35, 0.1, 0.1) : NAVY });
  page.drawText(spec.company, { x: 40, y: height - 34, size: 14, font: bold, color: WHITE });
  page.drawText(spec.address, { x: 40, y: height - 72, size: 9, font, color: MUTED });
  let y = drawMeta(page, font, bold, spec, 40, height - 104, width - 80);
  y = drawTable(page, font, bold, spec, 40, y, width - 80);
  finish(page, bold, spec, 40, y - 8, width - 80);
}

const layouts = {
  letter: layoutLetter,
  invoice: layoutInvoice,
  pricelist: layoutPricelist,
  banner: layoutBanner,
  fax: layoutFax,
  plain: layoutPlain,
  agent: layoutAgent,
  reseller: layoutReseller,
  ukInvoice: layoutUkInvoice,
  ukAgent: layoutUkAgent,
};

async function render(spec, regularBytes, boldBytes) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(regularBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });
  const page = doc.addPage(A4);
  const { width, height } = page.getSize();
  const rng = mulberry32(hashName(spec.file));
  paintBackground(page, spec, width, height, rng);
  layouts[spec.layout](page, font, bold, spec, width, height);
  if (spec.stamp) drawStamp(page, bold, spec.stamp, width - 150, height - 140);
  if (spec.scan) {
    page.drawText('scan replica · not a photograph', {
      x: 40,
      y: 24,
      size: 7,
      font,
      color: rgb(0.45, 0.42, 0.38),
      rotate: degrees(spec.shady ? 1.2 : 0.4),
    });
  }
  return doc.save();
}

async function main() {
  if (docs.length !== 20) throw new Error(`Expected 20 specs, got ${docs.length}`);
  const scans = docs.filter((d) => d.scan).length;
  if (scans !== 10) throw new Error(`Expected 10 scans, got ${scans}`);
  const uk = docs.filter((d) => d.dateLabel === 'Дата пропозиції').length;
  if (uk !== 5) throw new Error(`Expected 5 Ukrainian docs, got ${uk}`);

  const regularBytes = await readFile(path.join(FONT_DIR, 'NotoSans-Regular.ttf'));
  const boldBytes = await readFile(path.join(FONT_DIR, 'NotoSans-Bold.ttf'));
  await mkdir(OUT_DIR, { recursive: true });

  for (const spec of docs) {
    const bytes = await render(spec, regularBytes, boldBytes);
    const dest = path.join(OUT_DIR, spec.file);
    await writeFile(dest, bytes);
    console.log(spec.file, bytes.length);
  }
  console.log(`Wrote ${docs.length} PDFs to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
