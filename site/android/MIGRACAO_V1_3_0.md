# Plano de migração V1.2.1 → V1.3.0

- Identidade: `br.com.sentinelatapajos.app` (mantida).
- versionCode antigo: 4; novo: 5.
- Mesmo certificado SHA-256 da V1.2.1; comparar com `apksigner verify --print-certs`.
- Sem mudança de schema de arquivo `sentinela-field-v1`, nome de banco/cópia local `field-packet.json` e `SharedPreferences` (fieldMode).
- Não há permissão de rede nova; o site abre no navegador do sistema.
- Novas áreas online: Histórico regional, timeline e previsão do tempo, quando presentes no Site original publicado.
- Cópias offline importadas continuam estáticas e só mudam com uma nova importação autorizada.
- Instalar sobre V1.2.1; **não desinstalar**, **não limpar dados**. O sistema Android valida o certificado na atualização.
- Conferir no aparelho a tela inicial, abertura do navegador, login, leitura sem internet, importação, atualização sobre V1.2.1, histórico, previsão e mapas 3D.
- Se o Android reportar `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, interrompa o procedimento: NÃO desinstale o app.
