# 🎨 Design System - Córtex Beach

Guia completo de design e componentes reutilizáveis.

## 📐 Identidade Visual

### Logo
- **Arquivo:** `C:\Users\mario\Downloads\cortex_beach_white.png`
- **Versão:** White (para fundos escuros)
- **Dimensões:** Padrão (será dimensionado conforme necessário)
- **Uso:** Header, login, painel público

### Paleta de Cores

#### Primária
```
Cor: Azul
Hex: #0066CC
RGB: 0, 102, 204
HSL: 210°, 100%, 40%
Uso: Botões principais, links, headers
```

#### Secundária
```
Cor: Laranja
Hex: #FF6600
RGB: 255, 102, 0
HSL: 25°, 100%, 50%
Uso: Alertas, destaque, hover states
```

#### Neutras
```
Preto: #000000
Cinza Escuro: #333333
Cinza Médio: #666666
Cinza Claro: #999999
Cinza Muito Claro: #E5E7EB
Branco: #FFFFFF
```

#### Semânticas
```
Sucesso: #10B981 - Operações bem-sucedidas
Perigo: #EF4444 - Erros e ações destrutivas
Aviso: #F59E0B - Avisos e atenção
Info: #0066CC - Informações
```

### Tipografia

#### Inter (Interfaces)
- **Pesos:** 400, 500, 600, 700
- **Tamanhos Base:**
  - H1: 2rem (32px)
  - H2: 1.5rem (24px)
  - H3: 1.25rem (20px)
  - Body: 1rem (16px)
  - Small: 0.875rem (14px)
  - Tiny: 0.75rem (12px)
- **Line Height:** 1.5
- **Letter Spacing:** Normal

#### Montserrat (Display/Telão)
- **Pesos:** 600, 700
- **Tamanhos:**
  - Display LG: 2.5rem (40px)
  - Display MD: 2rem (32px)
  - Display SM: 1.5rem (24px)
- **Uso:** Títulos em telões, headers principais

## 🧩 Componentes Base

### Botões

#### Primário
```css
.btn-primary {
  background: #0066CC;
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
}

.btn-primary:hover {
  background: #0052A3;
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.25);
}
```

#### Secundário
```css
.btn-secondary {
  background: #FF6600;
  color: white;
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
}

.btn-secondary:hover {
  background: #E55A00;
  box-shadow: 0 4px 12px rgba(255, 102, 0, 0.25);
}
```

#### Outline
```css
.btn-outline {
  background: transparent;
  color: #0066CC;
  border: 2px solid #0066CC;
  padding: 10px 22px;
  border-radius: 6px;
  font-weight: 600;
}

.btn-outline:hover {
  background: #0066CC;
  color: white;
}
```

#### Tamanhos
- **LG:** 50px altura, padding 16px 32px
- **MD:** 44px altura, padding 12px 24px (padrão)
- **SM:** 36px altura, padding 8px 16px

### Cards

#### Padrão
```css
.card {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-4px);
}
```

#### Com barra lateral
```css
.card {
  border-left: 4px solid #0066CC;
}
```

### Badges

#### Sucesso
```css
.badge-success {
  background: rgba(16, 185, 129, 0.1);
  color: #10B981;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
}
```

#### Aviso
```css
.badge-warning {
  background: rgba(245, 158, 11, 0.1);
  color: #F59E0B;
}
```

#### Perigo
```css
.badge-danger {
  background: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}
```

### Inputs

#### Text Input
```css
input {
  padding: 12px;
  border: 2px solid #E5E7EB;
  border-radius: 6px;
  font-size: 1rem;
  font-family: 'Inter', sans-serif;
}

input:focus {
  outline: none;
  border-color: #0066CC;
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}
```

### Tabelas

```css
table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: #F9FAFB;
  padding: 16px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #E5E7EB;
}

td {
  padding: 16px;
  border-bottom: 1px solid #E5E7EB;
}

tr:hover {
  background: #F9FAFB;
}
```

### Modals

```css
.modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 40px;
  z-index: 1000;
}

.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

## 📐 Espaçamento

### Grid System (8px)
```
0px   = 0
8px   = 1 unit
16px  = 2 units
24px  = 3 units
32px  = 4 units
40px  = 5 units
48px  = 6 units
56px  = 7 units
64px  = 8 units
```

### Margens Comuns
- **Padding Cards:** 24px
- **Padding Buttons:** 12px 24px
- **Margin Bottom H2:** 20px
- **Margin Bottom Sections:** 40px
- **Gap Grid:** 20px

## 🎭 Estados

### Hover
- Transição: 0.2s
- Efeito: Sombra + ligeiro deslocamento Y (-2px)

### Focus
- Border color: #0066CC
- Box shadow: 0 0 0 3px rgba(0, 102, 204, 0.1)

### Disabled
- Opacity: 0.7
- Cursor: not-allowed

### Loading
```css
.spinner {
  border: 4px solid rgba(0, 102, 204, 0.1);
  border-top: 4px solid #0066CC;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

## 📱 Breakpoints

```css
Desktop: 1200px+
Tablet:  768px - 1199px
Mobile:  < 768px
4K:      2560px+
```

### Media Queries Comuns
```css
/* Tablet */
@media (max-width: 768px) {
  /* Ajustes para tablet */
}

/* Mobile */
@media (max-width: 480px) {
  /* Ajustes para mobile */
}
```

## 🎬 Animações

### Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

animation: fadeIn 0.3s ease-in;
```

### Slide In
```css
@keyframes slideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

animation: slideIn 0.3s ease-out;
```

### Bounce
```css
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

animation: bounce 0.5s ease-in-out infinite;
```

### Duração Padrão
- **Rápido:** 0.2s (hover states)
- **Normal:** 0.3s - 0.4s (modal appears)
- **Lento:** 0.6s - 1s (page transitions)

## ♿ Acessibilidade

### Contraste
- AA: 4.5:1 (normal text)
- AA: 3:1 (large text)
- AAA: 7:1 (enhanced)

### Font Sizes
- Mínimo: 12px (tiny)
- Corpo: 16px
- Máximo legível em telão: 4rem

### Touch Targets
- Mínimo: 44px x 44px
- Preferencial: 48px x 48px

### Labeling
```html
<label for="email">E-mail</label>
<input id="email" type="email" />
```

## 🎨 Componentes Específicos

### Navbar
```
- Altura: 70px
- Background: #0066CC
- Logo: 1.5rem (24px)
- Items: display flex, gap 0
- Logo space: 250px (desktop)
```

### Card de Metric
```
- Background: white
- Border left: 4px #0066CC
- Padding: 20px
- Icon: 50x50px com gradient
- Hover: elevate com shadow
```

### Wizard
```
- Steps: 4
- Progress bar: completa width conforme avanço
- Transição entre steps: fadeIn
- Footer: sticky
```

### Carrossel (Telão)
```
- Full screen: 100vw x 100vh
- Font size: 2-4rem
- Transição: 20s entre telas
- Contraste: Alto (para visibilidade)
- Loading: Spinner ou aguarde
```

## 🔄 Padrões de Interação

### Forms
1. Focus no primeiro input
2. Validação em tempo real
3. Feedback imediato
4. Submit desabilitado se inválido

### Lists
1. Hover highlight (light background)
2. Click para detalhe
3. Ações rápidas (menu ...)
4. Pagination ou scroll infinito

### Modals
1. Overlay com opacity
2. Appear com scale + fade
3. Botões primário e secundário
4. Close button (X)

## 📐 Layout Patterns

### Card Grid
```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
gap: 20px;
```

### Stack Vertical
```css
display: flex;
flex-direction: column;
gap: 20px;
```

### Stats Grid
```css
display: grid;
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
gap: 20px;
```

## ✅ Checklist de Consistência

- [ ] Cores usam paleta definida
- [ ] Tipografia usa Inter ou Montserrat
- [ ] Espaçamento em múltiplos de 8
- [ ] Componentes seguem padrão
- [ ] Estados (hover, focus) implementados
- [ ] Responsividade testada
- [ ] Acessibilidade OK (contrast, labels)
- [ ] Animações suaves (0.2s-0.6s)

---

**Design System v1.0**
**Última atualização:** 2024-04-09
**Status:** ✅ Completo para MVP
