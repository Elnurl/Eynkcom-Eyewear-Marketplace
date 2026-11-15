import { Link } from 'wouter';
import { BrandLogo, BrandWord } from '@/components/brand-logo';
import './order-pages.css';

type LegalSlug = 'qaydalar' | 'mexfilik' | 'qaytarma' | 'satici-muqavilesi';

const pages: Record<LegalSlug, { eyebrow: string; title: string; lead: string; sections: { heading: string; body: string[] }[] }> = {
  qaydalar: {
    eyebrow: 'İstifadə şərtləri',
    title: 'EYNƏK qaydaları.',
    lead: 'Bu səhifə platformanın ilk satış mərhələsi üçün yazılıb. Hüquqi mətn müqavilə kimi yekunlaşdırılmayıb; sifariş, ödəniş və qaytarma şərtləri tərəfdaş mağazalarla razılaşdırıldıqca dəqiqləşəcək.',
    sections: [
      {
        heading: 'Platforma nədir',
        body: [
          'EYNƏK Azərbaycandakı optik mağazaların eynək çərçivələrini bir yerdə göstərən marketplace-dir. Malların satıcısı EYNƏK deyil, təsdiqlənmiş optik mağazadır.',
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
        body: ['Suallar üçün info@eynek.store ünvanına yazın.'],
      },
    ],
  },
  mexfilik: {
    eyebrow: 'Məxfilik',
    title: 'Məxfilik siyasəti.',
    lead: 'Bu siyasət eynek.store ünvanında fəaliyyət göstərən EYNƏK optik marketplace platforması üzrə şəxsi məlumatların toplanması, işlənməsi və qorunması qaydalarını müəyyən edir. Saytdan istifadə etməklə, sifariş verməklə və ya hesab yaratmaqla bu siyasəti qəbul etmiş sayılırsınız.',
    sections: [
      {
        heading: 'Operator və əhatə',
        body: [
          'Şəxsi məlumatların operatoru EYNƏK-dir (bundan sonra — «Platforma»). Platforma Azərbaycan Respublikasının qanunvericiliyinə, o cümlədən «Şəxsi məlumatlar haqqında» Azərbaycan Respublikası Qanununa uyğun hərəkət edir.',
          'Məxfilik siyasəti alıcılar, qonaq sifarişləri, xəbər bülleteni abunəçiləri və EYNƏK-də satış üçün müraciət edən optik mağazaların əlaqəli nümayəndələri üçün tətbiq olunur.',
        ],
      },
      {
        heading: 'Toplanan məlumatlar',
        body: [
          'Hesab: ad, e-poçt ünvanı, parol (yalnız şifrələnmiş formada), giriş tarixçəsi, e-poçt təsdiqi statusu.',
          'Sifariş və çatdırılma: ad, telefon, e-poçt, çatdırılma ünvanı (kuryer seçiləndə), seçilmiş mağaza və məhsul məlumatları, ödəniş üsulu, sifariş statusu; qonaq sifarişləri üçün əlavə olaraq sifarişə baxış kodu.',
          'Satıcı müraciəti: mağaza adı, sahib və ya nümayəndənin adı, telefon, e-poçt, hüquqi ünvan, VÖEN (təqdim edilərsə), biznes fəaliyyəti və müraciət məzmunu.',
          'Texniki məlumatlar: IP ünvanı, brauzer və cihaz növü, sessiya identifikatorları, səhifə baxışları və təhlükəsizlik jurnalı (saxtakarlığın qarşısını almaq üçün lazım olan həddə).',
          'Virtual sınaq funksiyasından istifadə edəndə kamera görüntüsü, qayda olaraq, cihazınızda emal olunur; Platforma bu görüntünü profil və ya reklam məqsədilə saxlamır.',
        ],
      },
      {
        heading: 'Məqsəd və hüquqi əsas',
        body: [
          'Sifarişin qəbulu, mağazaya ötürülməsi, çatdırılmanın təşkili, sifariş statusunun göstərilməsi və sizinlə əlaqə saxlanması.',
          'Hesabın yaradılması, autentifikasiya, parolun bərpası və alıcı sifarişlərinin tarixçəsinin saxlanması.',
          'Satıcı müraciətlərinin yoxlanması, təsdiqlənmiş mağazaların idarə edilməsi və marketplace-in təhlükəsiz işləməsi.',
          'Ödəniş xidməti təminatçılarına yalnız ödənişin həyata keçirilməsi üçün lazım olan məlumatın ötürülməsi (məsələn, online kart ödənişi seçiləndə).',
          'Qanuni öhdəliklərin yerinə yetirilməsi və mübahisələrin həlli.',
          'Ayrıca razılıq verdiyiniz halda — xəbər bülleteni və marketinq mesajları.',
        ],
      },
      {
        heading: 'Saxlama müddəti və təhlükəsizlik',
        body: [
          'Məlumatlar sifariş və hesabla bağlı öhdəliklər bitənədək və ya qanunda nəzərdə tutulan müddət ərzində saxlanılır; mühasibat və vergi sənədləri üçün tələb olunan müddət bitdikdən sonra məqsədli şəkildə silinir və ya anonimləşdirilir.',
          'Məlumatlar müasir texniki və təşkilati tədbirlərlə qorunur: şifrələnmiş əlaqələr, məhdud giriş hüquqları, təhlükəsiz server mühiti.',
          'Şəxsi məlumatları reklam brokerlərinə satmırıq və tərəfdaşlarımızdan yalnız texniki xidmət və ya qanuni tələb çərçivəsində emal gözləyirik.',
        ],
      },
      {
        heading: 'Hüquqlarınız',
        body: [
          'Şəxsi məlumatlarınızın işlənməsi barədə məlumat almaq, düzəliş və ya silinmə tələb etmək, emala etiraz etmək və qanunla nəzərdə tutulmuş digər hüquqlardan istifadə etmək üçün info@eynek.store ünvanına müraciət edə bilərsiniz. Sorğu mümkün qədər tez, ən gec isə qanunda müəyyən olunmuş müddət içində cavablandırılır.',
          'Hesabınızı və məhsul gözləmə siyahısı kimi bəzi məlumatları şəxsi kabinetdən idarə edə bilərsiniz.',
        ],
      },
      {
        heading: 'Dəyişikliklər',
        body: [
          'Məxfilik siyasəti yenilənə bilər; yeni redaksiya eynek.store-da dərc olunur. Əhəmiyyətli dəyişikliklər barədə mümkün olduqda e-poçt və ya sayt vasitəsilə məlumat verilir. Son yenilənmə tarixi: 15 noyabr 2026.',
        ],
      },
    ],
  },
  qaytarma: {
    eyebrow: 'Qaytarma',
    title: 'Qaytarma və geri ödəniş.',
    lead: 'Bu qaydalar EYNƏK marketplace-i vasitəsilə alınan günəş eynəyi və optik çərçivə məhsullarına aiddir. Malların satıcısı təsdiqlənmiş optik mağazadır; qaytarma sorğusunu isə alıcı EYNƏK platformasına göndərir. Platforma sorğunu müvafiq mağaza ilə koordinasiya edir.',
    sections: [
      {
        heading: 'Qaytarma hüququ',
        body: [
          'Məhsulu çatdırılma və ya mağazadan uğurla götürülmə tarixindən etibarən 14 (on dörd) təqvim günü ərzində, istifadə olunmamış vəziyyətdə, orijinal qablaşdırma və lazım gələndə bütün komplekt hissələri ilə qaytara bilərsiniz.',
          'Qaytarma istəyinin səbəbi məcburi izah olunmur; istisnalar aşağıda göstərilir.',
          'İstehlakçı hüquqlarının müdafiəsi qanunvericiliyindən irəli gələn gücləndirilmiş zəmanət və zəruri hallarda qaytarma hüquqları bu mətnlə məhdudlaşdırılmır.',
        ],
      },
      {
        heading: 'Qaytarma mümkün olmayan hallar',
        body: [
          'İstifadə izləri olan, zədələnmiş, yuyulmuş və ya gigiyenik baxımdan təkrar satıla bilməyəcək vəziyyətə gətirilmiş çərçivə və eynəklər.',
          'Fərdi sifarişlə hazırlanmış və ya alıcının xüsusi tələbi ilə dəyişdirilmiş məhsullar (belə məhsul təklif edilərsə, məhsul səhifəsində ayrıca qeyd olunur).',
          'Qablaşdırması açılmış və keyfiyyəti pozulmuş məhsullar — qanunda müəyyən edilmiş istisnalar istisna olmaqla.',
          'Endirimli və ya kampaniya məhsulu üzrə satıcı və ya qanunla müəyyən edilmiş əlavə şərtlər mövcuddursa, həmin şərtlər tətbiq olunur.',
        ],
      },
      {
        heading: 'Qaytarma sorğusu necə göndərilir',
        body: [
          'Sifariş səhifəsində «Qaytarma sorğusu» düyməsindən istifadə edin və ya info@eynek.store ünvanına sifariş nömrənizi və qısa səbəbi yazın. Bir sifarişdə bir neçə mağaza varsa, hər mağaza hissəsi üçün ayrıca sorğu yaradılır.',
          'EYNƏK sorğunu 2 (iki) iş günü ərzində ilkin yoxlayır və sizə məhsulun hara qaytarılacağı, kuryer və ya mağazaya təhvil və lazım gələn sənədlər barədə məlumat verir.',
          'Məhsulu təhvil verərkən sifariş nömrəsi və alıcı adı göstərilməlidir. Qaytarma çatdırılmasının ödənişi, qanun və ya satıcı zəmanət şərtləri əsasında müəyyən edilir; EYNƏK əvvəlcədən razılaşdırılmamış əlavə xərcləri ödəmək öhdəliyi daşımır.',
        ],
      },
      {
        heading: 'Geri ödəniş',
        body: [
          'Qaytarılan məhsul mağaza və ya EYNƏK tərəfindən yoxlanılıb qəbul edildikdən sonra geri ödəniş 10 (on) iş günü ərzində həyata keçirilir.',
          'Online bank kartı ilə ödənilmiş məbləğ eyni kart hesabına qaytarılır. Nağd ödənişli sifarişlərdə geri ödəniş bank köçürməsi və ya tərəflərin yazılı razılaşdığı digər qanuni üsulla edilir.',
          'Çatdırılma haqqı yalnız qaytarma səbəbi satıcı və ya platforma xətası olduqda geri ödənilir; ümumi istəklə qaytarma zamanı ilk çatdırılma haqqı geri ödənilməyə bilər.',
          'Qaytarılmış və təsdiqlənmiş məhsula platforma komissiyası hesablanmır.',
        ],
      },
      {
        heading: 'Əlaqə',
        body: [
          'Qaytarma və geri ödəniş ilə bağlı suallar üçün info@eynek.store ünvanına və ya Dəstək mərkəzinə yazın.',
        ],
      },
    ],
  },
  'satici-muqavilesi': {
    eyebrow: 'Satıcılar üçün',
    title: 'Satıcı müqaviləsi.',
    lead: 'Bu müqavilə təsdiqlənmiş optik mağazanın EYNƏK (eynek.store) marketplace platformasında məhsul satışı və sifarişlərin icrası şərtlərini müəyyən edir. Mağaza müraciəti təsdiqlənəndə və satıcı panelindən istifadəyə başlayanda satıcı bu şərtlərlə razılaşmış sayılır.',
    sections: [
      {
        heading: '1. Təriflər və tərəflər',
        body: [
          '«Platforma» — EYNƏK optik marketplace-i (eynek.store) və onun texniki infrastrukturu.',
          '«Satıcı» — admin tərəfindən təsdiqlənmiş, öz adından optik məhsul satan hüquqi şəxs və ya fərdi sahibkar.',
          '«Alıcı» — Platforma vasitəsilə məhsul sifariş edən son istehlakçı.',
          'Platforma vasitəçi kimi çıxış edir; məhsulun mülkiyyətçisi və birbaşa satış müqaviləsinin tərəfi Satıcıdır, Alıcı ilə satış müqaviləsi Satıcı ilə bağlanır.',
        ],
      },
      {
        heading: '2. Qoşulma və təsdiq',
        body: [
          'Satıcı müraciəti Platformada qeyd olunur; təsdiq üçün vergi və biznes məlumatlarının düzgün təqdim edilməsi tələb olunur.',
          'Təsdiq alınmayan müraciət kataloqda görünmür və satış funksiyası aktivləşdirilmir.',
          'Hər Satıcı yalnız öz mağaza panelinə, sifarişlərinə və məhsul kataloquna çıxış edir.',
        ],
      },
      {
        heading: '3. Satıcının öhdəlikləri',
        body: [
          'Kataloqda yerləşdirilən şəkillər, təsvirlər, qiymətlər, stok və məhsul xüsusiyyətlərinin düzgün, aktual və qanunvericiliyə uyğun olması.',
          'Orijinal və ya qanuni yolla daxil edilmiş malların satışı; saxta və ya qadağan olunmuş məhsulun yerləşdirilməməsi.',
          'Sifarişə vaxtında cavab: təsdiq, rədd və ya alternativ təklif; stokun eyni vaxtda bir neçə sifarişə qarşılıq gələcək şəkildə idarə olunması.',
          'Çatdırılma və ya mağazadan götürmə üzrə Satıcının öhdəliyində olan addımların vaxtında yerinə yetirilməsi.',
          'Alıcı şəxsi məlumatlarının yalnız sifarişin icrası məqsədilə istifadəsi və üçüncü tərəflərə ötürülməməsi.',
          'Azərbaycan Respublikasının vergi, istehlakçı hüquqları və reklam qanunvericiliyinə riayət.',
        ],
      },
      {
        heading: '4. Məzmun və moderasiya',
        body: [
          'Yeni və dəyişdirilmiş məhsul elanları admin təsdiqinə qədər ictimai kataloqda gizli qala bilər.',
          'Qiymət, təsvir, şəkil və digər ictimai məzmunun əhəmiyyətli dəyişikliyi təkrar moderasiya tələb edə bilər; yalnız stok miqdarının yenilənməsi yenidən yoxlamanı avtomatik tələb etmir.',
          'Platforma qaydalara zidd məzmunu silmək, müvəqqəti dayandırmaq və ya mağaza hesabını bağlamaq hüququnu saxlayır.',
        ],
      },
      {
        heading: '5. Sifarişlər və ödəniş',
        body: [
          'Sifariş bir neçə Satıcıdan məhsul ehtiva edə bilər; hər Satıcı yalnız öz hissəsini təsdiqləyir və icra edir.',
          'Alıcı ödənişi nağd (çatdırılma və ya götürmə zamanı) və ya online bank kartı ilə edə bilər; kart ödənişləri lisenziyalı ödəniş təminatçısı vasitəsilə həyata keçirilir.',
          'Kuryer çatdırılma haqqını Satıcı təsdiq zamanı qeyd edir; mağazadan götürmə haqqı 0 (sıfır) AZN kimi göstərilir və alıcıdan əlavə götürmə haqqı tutulmur.',
          'Satıcı ödənişi birbaşa Alıcıdan və ya ödəniş sisteminin qaydalarına uyğun alır; Platforma nağd ödənişdə vəsaitin saxlayıcısı deyil.',
        ],
      },
      {
        heading: '6. Komissiya və hesablaşma',
        body: [
          'Platforma uğurla çatdırılmış və qaytarılmamış məhsul üzrə Satıcının aldığı məhsul məbləğinin 5% (beş faiz) komissiya tutur. Çatdırılma haqqından komissiya hesablanmır.',
          'Ləğv edilmiş, çatdırılmamış və ya qaytarılmış məhsula komissiya tətbiq olunmur.',
          'Komissiya və hesablaşma qaydaları dəyişdikdə Satıcıya ən azı 14 (on dörd) təqvim günü əvvəl e-poçt və ya satıcı paneli vasitəsilə məlumat verilir.',
        ],
      },
      {
        heading: '7. Məsuliyyət və müddət',
        body: [
          'Məhsulun keyfiyyəti, zəmanət, uyğunluq və qanuni bəyannamələr üzrə əsas məsuliyyət Satıcıya aiddir.',
          'Platforma texniki nasazlıq, fors-major və üçüncü tərəf xidmətlərinin (ödəniş, rabitə) pozuntuları hallarında məsuliyyəti qanunla icazə verilən həddə məhdudlaşdırır.',
          'Hər iki tərəf müqaviləni qaydalara uyğun yazılı xəbərdarlıqla və ya hesabın bağlanması ilə dayandıra bilər; əvvəl verilmiş sifarişlər icra olunana qədər öhdəliklər qüvvədə qalır.',
          'Mübahisələr əvvəlcə danışıqlar yolu ilə həll edilir; razılıq əldə olunmazsa, Azərbaycan Respublikasının məhkəmələri və qanunvericiliyi tətbiq olunur.',
        ],
      },
      {
        heading: '8. Əlaqə',
        body: [
          'Satıcılar üçün sat@eynek.store, ümumi sorğular üçün info@eynek.store. Son yenilənmə: 15 noyabr 2026.',
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
