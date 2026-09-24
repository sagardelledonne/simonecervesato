# Simone Cervesato · Personal Trainer

Sito one-page stile Apple: nero + cromato (dal logo SC), panca piana 3D che si scompone con lo scroll (Three.js), sezioni Chi sono, Risultati, Servizi, Dove, Come si inizia, Galleria, Domande, Contatti.

## File

- `index.html` – tutti i testi della pagina
- `assets/css/style.css` – grafica
- `assets/js/main.js` – animazioni allo scroll, grafico risultati, modulo contatti (numero WhatsApp ed email in cima al file)
- `assets/js/stage.js` – la panca 3D e la sua "esplosione" (6 gruppi di pezzi = 6 capitoli del metodo)
- `assets/img/` – foto (da Instagram, 640 px) e logo reso trasparente

## Provarlo in locale

```bash
python -m http.server 8000
```

poi aprire http://localhost:8000

## Da completare

- Foto originali in alta qualità (quelle di Instagram sono 640 px)
- Foto di gara con il marchio del fotografo (RECLIFT, `gara-concentrazione.webp`): tolta dal sito finché non c'è l'ok; si può rimettere nei Risultati e nella galleria
- Sigla della federazione della gara di panca (185 kg): scritta senza sigla
- Caratteri: si usano quelli di sistema (SF su Apple, Segoe UI su Windows, Roboto su Android), niente Google Fonts
- Pagina privacy (il modulo non salva dati: apre WhatsApp o l'email)
- Dominio simonecervesato.it
