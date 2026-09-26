import { Link } from 'wouter';
import { BrandLogo, BrandWord } from '@/components/brand-logo';
import './order-pages.css';

type LegalSlug = 'qaydalar' | 'mexfilik' | 'qaytarma' | 'satici-muqavilesi';

const pages: Record<LegalSlug, { eyebrow: string; title: string; lead: string; sections: { heading: string; body: string[] }[] }> = {
  qaydalar: {
    eyebrow: 'İstifadə şərtləri',
    title: 'EYNƏK.com qaydaları.',
    lead: 'Bu səhifə platformanın ilk satış mərhələsi üçün yazılıb. Hüquqi mətn müqavilə kimi yekunlaşdırılmayıb; sifariş, ödəniş və qaytarma şərtləri tərəfdaş mağazalarla razılaşdırıldıqca dəqiqləşəcək.',
    sections: [
      {
        heading: 'Platforma nədir',
        body: [
          'EYNƏK.com Azərbaycandakı optik mağazaların eynək çərçivələrini bir yerdə göstərən marketplace-dir. Malların satıcısı EYNƏK deyil, təsdiqlənmiş optik mağazadır.',
          'İlk satış mərhələsində kataloq günəş eynəkləri və optik çərçivələrlə məhdudlaşır. Reseptli linza hazırlığı hələ mövcud deyil.',
        ],
      },
      {
        heading: 'Sifariş',
        body: [
          'Alıcı hesab yaratmadan qonaq kimi sifariş verə bilər. Qonaq sifarişinə giriş ayrıca kodla qorunur; yalnız sifariş nömrəsi kifayət etmir.',
          'Bir səbətdə bir neçə mağazanın məhsulu ola bilər. Hər mağaza öz hissəsini ayrıca təsdiqləyir, hazırlayır və ya rədd edir.',
          'Hazırda satış sahəsi Bakı və Abşerondur. Kuryer çatdırılması və ya mağazadan pulsuz götürmə seçilə bilər.',
        ],
      },
      {
        heading: 'Ödəniş və çatdırılma',
        body: [
          'Kartla ödəniş hələ aktiv deyil. Mövcud üsul məhsulu aldığınız zaman nağd ödənişdir — kuryerdə və ya mağazadan götürəndə.',
          'Kuryer haqqı məhsul qiymətinə qarışdırılmır; mağaza təsdiqindən sonra ayrıca göstərilir. Mağazadan götürmə pulsuzdur.',
          'Mağazada əlavə kassa və ya kart ödənişi hələ tərəfdaş mağazalarla razılaşdırılmayıb.',
        ],
      },
      {
        heading: 'Əlaqə',
        body: ['Suallar üçün sat@eynek.com ünvanına yazın.'],
      },
    ],
  },
  mexfilik: {
    eyebrow: 'Məxfilik',
    title: 'Məlumatlarınız necə işlənir.',
    lead: 'EYNƏK.com sifarişi yerinə yetirmək və hesabınızı qorumaq üçün yalnız lazımi məlumatı toplayır. Bu mətn ilk satış mərhələsi üçün izahdır, ayrıca məxfilik siyasəti hələ notarial və ya hüquqi yekunlaşdırılmayıb.',
    sections: [
      {
        heading: 'Hansı məlumat toplanır',
        body: [
          'Sifariş üçün ad, telefon, e-poçt və kuryer seçiləndə çatdırılma ünvanı soruşulur.',
          'Hesab yaradanda e-poçt, ad və şifrə saxlanılır. E-poçt təsdiqlənənə qədər tam giriş verilmir.',
          'Satıcı müraciətində mağaza adı, əlaqə və ünvan məlumatları admin yoxlaması üçün saxlanılır.',
        ],
      },
      {
        heading: 'Məlumat nə üçün istifadə olunur',
        body: [
          'Sifarişi mağazaya çatdırmaq, statusu göstərmək və sizinlə əlaqə saxlamaq üçün.',
          'Qonaq sifarişinə yalnız sizin saxladığınız giriş kodu və ya daxil olduğunuz hesabla baxmaq olar.',
          'Məlumatları reklam üçün üçüncü tərəflərə satmırıq.',
        ],
      },
      {
        heading: 'Saxlama və hüquqlarınız',
        body: [
          'Sessiya və hesab məlumatları platformanın öz bazasında saxlanılır.',
          'Məlumatlarınızın silinməsi və ya düzəlişi üçün sat@eynek.com ünvanına yazın.',
        ],
      },
    ],
  },
  qaytarma: {
    eyebrow: 'Qaytarma',
    title: 'Qaytarma necə işləyir.',
    lead: 'Qaytarma sorğuları əvvəlcə EYNƏK.com-a göndərilməlidir. Geri ödəniş müddəti, qaytarma çatdırılması və hüquqi şərtlər hələ mağazalarla yekun razılaşdırılmayıb.',
    sections: [
      {
        heading: 'Kimə müraciət edilir',
        body: [
          'Alıcı qaytarma sorğusunu birbaşa mağazaya yox, EYNƏK.com-a göndərməlidir. Çatdırılmış və ya götürülmüş mağaza hissəsi üçün bunu sifariş səhifəsindən də etmək olar. Platforma həmin mağazanın sifariş hissəsi ilə əlaqələndirir.',
          'Malların satıcısı yenə də optik mağazadır. EYNƏK.com məhsulun sahibi kimi çıxış etmir.',
        ],
      },
      {
        heading: 'Hələ razılaşdırılmayanlar',
        body: [
          'Geri ödənişin neçə günə ediləcəyi, qaytarma çatdırılmasının kimə aid olduğu və qanuni zəmanət müddəti bu mətndə vəd edilmir.',
          'Pilot komissiya qaytarılmış məhsula tətbiq olunmur. Admin geri ödənişi yalnız real maliyyə əməliyyatından sonra qeydə alır.',
        ],
      },
      {
        heading: 'Əlaqə',
        body: ['Qaytarma sorğusu üçün sat@eynek.com ünvanına sifariş nömrənizi yazın.'],
      },
    ],
  },
  'satici-muqavilesi': {
    eyebrow: 'Satıcılar üçün',
    title: 'Satıcı şərtləri.',
    lead: 'Optik mağaza EYNƏK.com-da yalnız admin təsdiqindən sonra sata bilər. Bu səhifə pilot qaydaları izah edir; ayrıca imzalanmış müqavilə hələ tələb olunmur, amma yekun hüquqi mətn yerinə keçmir.',
    sections: [
      {
        heading: 'Kim sata bilər',
        body: [
          'İctimai müraciət açıqdır, lakin təsdiq olunmayan mağaza kataloq, qiymət və stok idarə edə bilməz.',
          'Hər mağaza yalnız öz vitrinini görür və dəyişir. Başqa mağazanın inventarına giriş yoxdur.',
        ],
      },
      {
        heading: 'Məhsullar və sifarişlər',
        body: [
          'Yeni elanlar admin təsdiqinə qədər gizlin qalır. İctimai məzmunu sonradan dəyişmək yenidən yoxlama tələb edə bilər; yalnız stok dəyişikliyi təkrar moderasiya yaratmır.',
          'Sifariş gələndə mağaza öz hissəsini təsdiqləməli və ya rədd etməlidir. Eyni vaxtda iki veb sifarişi stoku aşmamalıdır.',
          'Kuryer haqqını mağaza təsdiq zamanı yazır. Mağazadan götürmə pulsuzdur və 0 AZN kimi qeyd olunur.',
        ],
      },
      {
        heading: 'Komissiya',
        body: [
          'Pilot komissiya uğurla çatdırılmış və qaytarılmamış məhsul məbləğinin 5%-idir. Çatdırılma haqqından komissiya alınmır.',
          'Yalnız yaradılmış, amma hələ çatdırılmamış sifarişə komissiya düşmür.',
        ],
      },
    ],
  },
};

const links: { href: string; label: string }[] = [
  { href: '/qaydalar', label: 'Qaydalar' },
  { href: '/mexfilik', label: 'Məxfilik' },
  { href: '/qaytarma', label: 'Qaytarma' },
  { href: '/satici-muqavilesi', label: 'Satıcı müqaviləsi' },
];

export function LegalPage({ slug }: { slug: LegalSlug }) {
  const page = pages[slug];
  return (
    <main className="legal-page">
      <div className="legal-wrap">
        <article className="legal-card">
          <Link href="/" className="brand" data-testid={`link-legal-home-${slug}`}><BrandLogo /></Link>
          <div className="eyebrow" style={{ marginTop: 22 }}>{page.eyebrow}</div>
          <h1>{page.title}</h1>
          <p className="legal-lead">{page.lead}</p>
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
          <nav className="legal-nav" aria-label="Hüquqi səhifələr">
            {links.filter((link) => link.href !== `/${slug}`).map((link) => (
              <Link href={link.href} key={link.href}>{link.label}</Link>
            ))}
            <Link href="/"><BrandWord /> ana səhifə</Link>
          </nav>
        </article>
      </div>
    </main>
  );
}
