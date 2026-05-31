# Sgombero a Thundertree

> Il diario di Venomfang, alla voce *Seccature*.

Un arcade reflex da browser (stile whack-a-mole) ambientato nella campagna D&D. Sei Venomfang, un giovane drago verde che difende il proprio tesoro dagli avventurieri.

## 🎮 Come si gioca

- **Tocca/clicca gli intrusi** per sgomberarli prima che raggiungano il tesoro
- **Combo**: colpisci in sequenza per moltiplicare i punti (fino a ×5)
- **Soffio Velenoso**: si carica con ogni sgombero; quando è pieno, spazz via tutti gli intrusi visibili
- **Hoard**: se arriva a 0, game over
- **10 ondate** attraverso 3 atti, con difficoltà crescente e boss finali

## 🚀 Avvio locale

Apri semplicemente `index.html` nel browser, oppure usa un server locale:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve

# Con PHP
php -S localhost:8000
```

Poi visita `http://localhost:8000`.

## 🌐 Deploy su Netlify

### Opzione 1: Drag-and-drop
1. Trascina l'intera cartella del progetto su [Netlify Drop](https://app.netlify.com/drop)
2. Fatto! Il sito è live.

### Opzione 2: Git
1. Carica il progetto su GitHub/GitLab/Bitbucket
2. Connetti il repository a Netlify
3. Impostazioni build:
   - **Build command**: (lascia vuoto)
   - **Publish directory**: `.` (root)
4. Deploy automatico ad ogni push

## 🛠️ Struttura del progetto

```
sgombero-thundertree/
├── index.html          # Pagina principale
├── styles.css          # Stili (tema grimorio/dragone)
├── js/
│   ├── data.js         # Roster intrusi, ondate, battute
│   ├── game.js         # Logica di gioco e stato
│   └── main.js         # Game loop, rendering, input
└── README.md           # Questo file
```

## 🎨 Design

- **Mobile-first**: ottimizzato per touch, con aree bersaglio generose
- **Responsive**: si adatta a qualsiasi schermo mantenendo l'aspect ratio
- **Estetica grimorio**: verde veleno, oro brunito, pergamena
- **Palette dinamica**: cambia colore tra i tre atti per dare progressione visiva

## 🐉 Meccaniche speciali

### I quattro PG (mini-boss)
- **Rakuzen** (monaca mezzorca): 3 tap, pugno devastante se non fermata
- **Giggin** (bardo drow): canta e accorcia la durata degli altri intrusi
- **Nour** (negromante drow): evoca non-morti ogni 1.5s
- **Elariel** (guerriera alto elfo): scuda Nour finché è in campo

### Intrusi speciali
- **Cultista del Drago**: bonus +30 punti e +5 hoard
- **Cespuglio del 1487**: easter egg raro, +50 punti

## 📱 Compatibilità

- ✅ Chrome/Edge (desktop e mobile)
- ✅ Firefox
- ✅ Safari (iOS e macOS)
- ✅ Touch e mouse supportati

## 🏆 Record

Il miglior punteggio viene salvato in `localStorage` e mostrato nella schermata iniziale.

## 📝 Crediti

Testi narrativi e concept: campagna D&D del committente  
Sviluppo: generato con AI (Claude)  
Font: [Cinzel Decorative](https://fonts.google.com/specimen/Cinzel+Decorative), [EB Garamond](https://fonts.google.com/specimen/EB+Garamond)

## 📄 Licenza

Progetto creato per uso personale/educativo. Tutti i diritti riservati.

---

*"Respinti tutti. Scaglie lucide, lista aggiornata, tesoro intatto."*  
— Venomfang
