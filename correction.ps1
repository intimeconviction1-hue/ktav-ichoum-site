# =============================================================================
# KTAV ICHOUM - Correction factuelle : affaire Benayahu Razi
#
# Une premiere version presentait le principal suspect comme mineur.
# Les publications israeliennes identifient le principal mis en cause comme
# un homme majeur ; des mineurs figurent parmi les autres interpelles.
#
# Ajoute egalement une note de mise a jour datee en pied d'article, comme
# l'impose la charte ethique (article 5).
#
#   powershell -ExecutionPolicy Bypass -File .\correction.ps1
#
# Annulable :  git checkout -- .
# =============================================================================

$ErrorActionPreference = 'Stop'
$utf8 = New-Object System.Text.UTF8Encoding($false)

# --- 1. Corrections de texte -------------------------------------------------
$paires = @(
  @("le principal suspect, mineur au moment des faits, a été interpellé, avec trois autres personnes dont une gardienne de prison soupçonnée d'entrave",
    "le principal suspect, un homme majeur, a été interpellé, avec plusieurs autres personnes — dont des mineurs et une fonctionnaire pénitentiaire soupçonnée d'entrave"),

  @("l'arrestation du principal suspect, mineur au moment des faits, ainsi que de trois autres personnes",
    "l'arrestation du principal suspect, un homme majeur, ainsi que de plusieurs autres personnes, dont des mineurs"),

  @("le principal suspect, mineur au moment des faits, a été arrêté",
    "le principal suspect, un homme majeur, a été arrêté"),

  @("Le principal suspect, mineur, et trois autres",
    "Le principal suspect, un homme majeur, et plusieurs autres"),

  # variantes de securite, au cas ou une formulation aurait echappe
  @("le principal suspect, mineur au moment des faits,", "le principal suspect, un homme majeur,"),
  @("Le principal suspect, mineur,", "Le principal suspect, un homme majeur,")
)

$total = 0
foreach ($f in Get-ChildItem -Filter *.html) {
  $t = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
  $a = $t
  foreach ($p in $paires) { $t = $t.Replace($p[0], $p[1]) }
  if ($t -ne $a) {
    [System.IO.File]::WriteAllText($f.FullName, $t, $utf8)
    Write-Host ("corrige : " + $f.Name) -ForegroundColor Green
    $total++
  }
}
Write-Host "$total fichier(s) corrige(s)." -ForegroundColor Cyan

# --- 2. Note de mise a jour en pied d'article --------------------------------
$note = @'
<aside class="maj" style="max-width:72ch;margin:34px auto 0;padding:16px 20px;border-left:3px solid #b8860b;background:rgba(184,134,11,.07);font-size:.92rem;line-height:1.6">
  <b style="letter-spacing:.06em;text-transform:uppercase;font-size:.78rem">Mise à jour du 7 août 2026</b><br>
  Une première version de cet article présentait le principal suspect comme mineur. Les publications
  israéliennes identifient le principal mis en cause comme un homme majeur ; plusieurs mineurs figurent
  parmi les autres personnes interpellées. Les faits se sont déroulés le 11 juillet 2026 dans un
  appartement de location de courte durée du quartier de Nahlaot, à Jérusalem. Début août, une
  déclaration de procureur a été déposée et les détentions prolongées, dans l'attente des actes
  d'accusation. Toutes les personnes mises en cause sont présumées innocentes.
</aside>
'@

$p = '.\article.html'
if (Test-Path $p) {
  $t = [System.IO.File]::ReadAllText((Resolve-Path $p), [System.Text.Encoding]::UTF8)
  if ($t -match 'Mise à jour du 7 août 2026') {
    Write-Host "note deja presente." -ForegroundColor Yellow
  }
  elseif ($t -match '</article>') {
    $i = $t.LastIndexOf('</article>')
    $t = $t.Substring(0, $i) + $note + $t.Substring($i)
    [System.IO.File]::WriteAllText((Resolve-Path $p), $t, $utf8)
    Write-Host "note de mise a jour ajoutee avant </article>" -ForegroundColor Green
  }
  elseif ($t -match '<footer') {
    $i = $t.IndexOf('<footer')
    $t = $t.Substring(0, $i) + $note + $t.Substring($i)
    [System.IO.File]::WriteAllText((Resolve-Path $p), $t, $utf8)
    Write-Host "note de mise a jour ajoutee avant le pied de page" -ForegroundColor Green
  }
  else {
    Write-Host "ancrage introuvable : ajoutez la note a la main." -ForegroundColor Yellow
  }
}

# --- 3. Controles -------------------------------------------------------------
Write-Host ""
Write-Host "=== Controles ===" -ForegroundColor Yellow
$m = Select-String -Path *.html -Pattern 'suspect, mineur','suspect (17 ans)','mineur au moment des faits' -SimpleMatch
if ($m) { $m | ForEach-Object { Write-Host "RESTE : $($_.Filename) ligne $($_.LineNumber)" } }
else { Write-Host "aucune mention residuelle du suspect mineur." -ForegroundColor Green }
$n = Select-String -Path *.html -Pattern 'Mise à jour du 7 août 2026' -SimpleMatch
Write-Host ("note de mise a jour presente : " + $(if ($n) { 'oui' } else { 'non' }))
