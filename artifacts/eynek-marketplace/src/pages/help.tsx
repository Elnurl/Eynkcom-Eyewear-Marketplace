import { useEffect } from 'react';
import { Link } from 'wouter';
import { BrandLogo, BrandWord } from '@/components/brand-logo';
import './order-pages.css';

export function HelpPage() {
  useEffect(() => {
    const id = window.location.hash.replace('#', '');
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, []);
  return (
    <main className="legal-page">
      <div className="container">
        <article className="legal-card">
          <Link href="/" className="brand" data-testid="link-help-home"><BrandLogo /></Link>
          <div className="eyebrow" style={{ marginTop: 22 }}>Dəstək</div>
          <h1>Dəstək mərkəzi.</h1>
          <p className="legal-lead">Sifarişinizi izləyin, alış qaydasını oxuyun və suallarınızı buradan yoxlayın.</p>
          <section id="sifaris">
            <h2>Sifarişimi izlə</h2>
            <p>Hesabınızla verilmiş sifarişlər ayrıca sifariş səhifəsində görünür. Qonaq sifarişi tamamlama addımındakı «Sifarişi izlə» keçidi ilə açılır. Yalnız sifariş nömrəsi səhifəni açmır.</p>
            <p><Link href="/account/orders" data-testid="link-help-orders">Sifarişləriniz</Link></p>
          </section>
          <section id="suallar">
            <h2>Suallar</h2>
            <ul>
              <li>Ödəniş məhsulu alanda nağddır: kuryerdə və ya mağazadan götürəndə. Kartla ödəniş hələ aktiv deyil.</li>
              <li>Çatdırılma Bakı və Abşerondadır. Mağazadan götürmə pulsuzdur.</li>
              <li>Qaytarma sorğusu birbaşa mağazaya yox, EYNƏK-ə göndərilir. Geri ödəniş müddəti hələ razılaşdırılmayıb.</li>
            </ul>
          </section>
          <section id="telimat">
            <h2>Təlimatlar</h2>
            <ul>
              <li>Məhsulu səbətə əlavə edin və sifarişi qonaq kimi və ya hesabınızla tamamlayın.</li>
              <li>Mağaza təsdiqindən sonra hazırlıq və çatdırılma mərhələsini sifariş səhifəsində izləyin.</li>
              <li>Çatdırılmış hissə üçün «Qaytarma sorğusu» ilə EYNƏK-ə yazın.</li>
            </ul>
          </section>
          <section id="elaqe">
            <h2>Əlaqə</h2>
            <p>Suallarınız üçün sağ alt küncdəki dəstək çatından istifadə edin və ya bu səhifədəki təlimatlara baxın.</p>
          </section>
          <nav className="legal-nav" aria-label="Dəstək səhifələri">
            <Link href="/qaydalar">Qaydalar</Link>
            <Link href="/qaytarma">Qaytarma</Link>
            <Link href="/"><BrandWord /> ana səhifə</Link>
          </nav>
        </article>
      </div>
    </main>
  );
}
