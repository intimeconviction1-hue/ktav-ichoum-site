# =============================================================================
# KTAV ICHOUM - Finalisation visuelle
#
# 1. Remplace les dernieres images aleatoires (loremflickr, picsum) par la
#    couverture correspondant au sujet.
# 2. Sur police.html et justice.html, remplace la couverture pleine par le
#    cadre transparent superpose a la photographie libre correspondante.
# 3. Branche les liens du pied de page vers les pages legales.
#
#   powershell -ExecutionPolicy Bypass -File .\finaliser.ps1
#
# Annulable :  git checkout -- .
# =============================================================================

$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path .\assets\covers\cadres)) {
  Write-Host "ERREUR : assets\covers\cadres introuvable. Lancez d'abord install-covers.ps1." -ForegroundColor Red
  exit 1
}

function Cible($url) {
  switch -regex ($url) {
    'courthouse|court|justice|tribunal' { './assets/covers/justice.svg'; break }
    'police|cop|siren'                  { './assets/covers/police.svg'; break }
    'protest|people|crowd|city'         { './assets/covers/societe.svg'; break }
    'forest|green|night|dark'           { './assets/covers/enquetes.svg'; break }
    'mafia|gang|weapon'                 { './assets/covers/crime-organise.svg'; break }
    default                             { './assets/covers/faits-divers.svg' }
  }
}

# --- 1. Couvertures a la place des images aleatoires -------------------------
$rx = 'https?://(?:loremflickr\.com|picsum\.photos)[^"''\s)]*'
$imgTotal = 0
$fichiers = @(Get-ChildItem -Filter *.html) + @(Get-ChildItem .\assets -Filter *.css -ErrorAction SilentlyContinue)

foreach ($f in $fichiers) {
  $texte = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
  $n = ([regex]::Matches($texte, $rx)).Count
  if ($n -eq 0) { continue }
  $css = $f.Extension -eq '.css'
  $texte = [regex]::Replace($texte, $rx, {
    param($m); $c = Cible $m.Value
    if ($css) { $c -replace '\./assets/', './' } else { $c }
  })
  [System.IO.File]::WriteAllText($f.FullName, $texte, $utf8)
  Write-Host ("couvertures : {0}  ({1})" -f $f.Name, $n) -ForegroundColor Green
  $imgTotal += $n
}

# --- 2. Photographies sur les rubriques Police et Justice --------------------
$photos = @(
  @{ page = 'police.html';  rub = 'police';  img = 'commissariat-jerusalem.jpg' },
  @{ page = 'justice.html'; rub = 'justice'; img = 'cour-supreme-jerusalem.jpg' }
)

foreach ($p in $photos) {
  if (-not (Test-Path $p.page)) { continue }
  if (-not (Test-Path (".\assets\photos\" + $p.img))) {
    Write-Host ("photo absente, ignore : " + $p.img) -ForegroundColor Yellow
    continue
  }
  $texte = [System.IO.File]::ReadAllText((Resolve-Path $p.page), [System.Text.Encoding]::UTF8)
  $motif = "url\((['""]?)\./assets/covers/" + $p.rub + "\.svg\1\)"
  $remp  = "url('./assets/covers/cadres/" + $p.rub + ".svg'),url('./assets/photos/" + $p.img + "')"
  $n = ([regex]::Matches($texte, $motif)).Count
  if ($n -gt 0) {
    $texte = [regex]::Replace($texte, $motif, $remp)
    [System.IO.File]::WriteAllText((Resolve-Path $p.page), $texte, $utf8)
    Write-Host ("photo posee : {0}  ({1})" -f $p.page, $n) -ForegroundColor Green
  } else {
    Write-Host ("aucune couverture a remplacer dans " + $p.page) -ForegroundColor Yellow
  }
}

# --- 3. Liens du pied de page vers les pages legales -------------------------
$paires = @(
  @('<a href="#">Mentions légales</a><a href="#">Confidentialité</a><a href="#">CGU</a>', '<a href="mentions-legales.html">Mentions légales</a><a href="confidentialite.html">Confidentialité</a><a href="charte-ethique.html">Charte éthique</a>'),
  @('<li><a href="#">Charte éthique</a></li>', '<li><a href="charte-ethique.html">Charte éthique</a></li>'),
  @('<li><a href="#">Contact</a></li>', '<li><a href="mentions-legales.html">Contact</a></li>')
)
$nl = 0
foreach ($f in Get-ChildItem -Filter *.html) {
  $texte = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
  $avant = $texte
  foreach ($pp in $paires) { $texte = $texte.Replace($pp[0], $pp[1]) }
  if ($texte -ne $avant) {
    [System.IO.File]::WriteAllText($f.FullName, $texte, $utf8)
    $nl++
  }
}
Write-Host "liens legaux branches sur $nl page(s)." -ForegroundColor Green

# --- Controles ---------------------------------------------------------------
Write-Host ""
Write-Host "=== Controles ===" -ForegroundColor Yellow
$r = Select-String -Path *.html, .\assets\*.css -Pattern 'loremflickr|picsum' -ErrorAction SilentlyContinue
Write-Host ("images externes restantes : " + $(if ($r) { $r.Count } else { 0 }))
$m = Select-String -Path *.html -Pattern '17 ans' -SimpleMatch
Write-Host ("mentions '17 ans'         : " + $(if ($m) { $m.Count } else { 0 }))
foreach ($pg in @('mentions-legales.html','confidentialite.html','charte-ethique.html')) {
  Write-Host ("page $pg presente        : " + (Test-Path $pg))
}
