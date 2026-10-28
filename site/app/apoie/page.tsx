import type { Metadata } from 'next';
import { ApoiePixCopy } from '../../components/apoie-pix-copy';
import { getApoiePixConfig } from '../../lib/apoie-pix';
import styles from './style.module.css';

export const metadata: Metadata = {
  title: 'Me paga um café? ☕ | Sentinela Tapajós',
  description: 'Apoie voluntariamente o desenvolvimento do Sentinela Tapajós com um cafezinho simbólico.',
};

// Configuração de Pix deve ser lida somente no servidor. Não pré-renderizar a página.
export const dynamic = 'force-dynamic';

export default function ApoieSentinelaPage() {
  const pix = getApoiePixConfig({});

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <a className={styles.back} href="/">← Voltar à visão geral</a>
        <span className={styles.brand}>🌿 SENTINELA TAPAJÓS</span>
      </header>
      <main className={styles.main}>
        <p className={styles.eyebrow}>APOIO VOLUNTÁRIO · PROJETO INDEPENDENTE</p>
        <h1>Me paga um café? ☕</h1>
        <p className={styles.intro}>
          O Sentinela fica de olho na Amazônia. Já quem cuida dos mapas,
          servidores e bugs às vezes precisa de um café — ou dois! 😄
          Se o projeto é útil para você, que tal oferecer um <strong>cafezinho simbólico</strong>?
          O valor é livre e seu apoio ajuda a manter a plataforma online e melhorá-la.
        </p>
        <div className={styles.columns}>
          <section className={styles.card} aria-labelledby="coffee-title">
            <p className={styles.overline}>PIX EMPRESARIAL · CNPJ</p>
            <h2 id="coffee-title">Um café para o guardião da floresta?</h2>
            <p>
              É só um jeito divertido de apoiar o desenvolvimento do Sentinela.
              Os mapas, informações e alertas continuam <strong>gratuitos</strong>,
              mesmo para quem prefere chá. 🍵 Não há benefícios digitais em troca do apoio.
            </p>
            {pix.enabled && pix.cnpjKey && pix.businessName ? (
              <div className={styles.pixPanel}>
                <p className={styles.pixLabel}>Favorecido informado pelo projeto</p>
                <strong>{pix.businessName}</strong>
                <p className={styles.pixLabel}>Chave Pix (CNPJ)</p>
                <strong className={styles.key}>{pix.cnpjKey}</strong>
                <div className={styles.copyArea}><ApoiePixCopy cnpj={pix.cnpjKey} /></div>
                <p className={styles.footnote}>
                  Escolha livremente o valor no seu aplicativo bancário. Antes de pagar,
                  confira o favorecido exibido pelo banco. O Sentinela não solicita
                  senhas, comprovantes nem dados financeiros.
                </p>
              </div>
            ) : (
              <div className={styles.disabled} role="status">
                <strong>☕ A cafeteira ainda está desligada</strong>
                <p>
                  Pagamentos desativados. A chave Pix empresarial ainda
                  não foi habilitada ou verificada. Nenhum QR Code, checkout ou transferência é gerado.
                </p>
              </div>
            )}
          </section>
          <aside className={styles.card} aria-labelledby="why-title">
            <h2 id="why-title">Para onde vai esse cafezinho?</h2>
            <ul>
              <li>Servidores e coletores — eles não se alimentam de café.</li>
              <li>Correção de bugs e melhorias de uso no celular.</li>
              <li>Novas camadas ambientais e evolução do histórico.</li>
            </ul>
            <p>
              O café é uma metáfora para contribuição voluntária destinada à manutenção
              e ao desenvolvimento de um aplicativo independente. Não é campanha
              beneficente nem arrecadação oficial; não há promessa de dedução fiscal.
            </p>
          </aside>
        </div>
        <footer className={styles.footer}>
          Sentinela Tapajós · Com café ou sem café, o mapa continua gratuito. 🌿
        </footer>
      </main>
    </div>
  );
}
