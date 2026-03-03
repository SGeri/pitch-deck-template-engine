import path from 'node:path';

type FileParser = (content: string) => Promise<string>;

const TEMPORARY_FIXED_CONTENT = `
================================================================================
MOL GROUP - FY 2025 (Q4) REPORT — VARIANT 0 (ORIGINAL / OG)
Forrás: presentation-of-q4-2025_x_consulting.pdf
1:1 adatkinyerés minden diáról
================================================================================


SLIDE 1 - CÍMLAP (PDF oldal 1)
─────────────────────────────────────────────
  Cím (piros, nagy):          [1] = "FOURTH QUARTER 2025 RESULTS"
  Alcím:                      [2] = "20 FEBRUARY 2026"
  Képek:                      Háttérkép (jobb oldalon) + MOL logó (bal alsó sarok)


SLIDE 2 - EXECUTIVE SUMMARY (PDF oldal 2, dia szám: 5)
─────────────────────────────────────────────
  Cím (piros):                [1] = "CLEAN CCS EBITDA REACHED 877 MN USD IN Q4 2025"
  Alcím:                      [2] = "REFINING AND CONSUMER SERVICES THE KEY CONTRIBUTORS IN THE FINAL QUARTER"

  Szekció fejléc:             "FINANCIALS"
  Szöveges blokk:             [3] =
    • "Group Clean CCS EBITDA up by 29% YoY to USD 877 mn; full year operating cash flow before working capital above USD 2.6 bn"
    • "Impairments weighed on profit before tax in the final quarter of 2025 and was down to USD 47 mn"
    • "Upstream EBITDA came in at USD 247 mn, down 13% QoQ in line with lower crude oil and natural gas prices"
    • "Downstream Clean CCS EBITDA marked a 48% increase YoY and reached USD 394 mn in the fourth quarter as refining margins remained strong and more than offset the impact of weak petchem and lower crude processing as a result of the Danube refinery fire"
    • "Consumer Services EBITDA reached USD 205 mn, supported FX and one-off effects and with organic increase in both fuel and non-fuel results"
    • "Circular Economy Services EBITDA was supported by seasonality and the impact of efficiency measures and reached USD 28 mn in Q4"

  Szekció fejléc:             "OPERATIONAL AND OTHER DEVELOPMENTS"
  Szöveges blokk:             [4] =
    • "Extraordinary General meeting supported the Group's transition to a holding setup"
    • "Fire-damaged CDU in Danube refinery expected to be rebuilt by Q3 2026, reconstruction expected to result in around USD 50 mn extra CAPEX"
    • "Share and purchase agreement signed on acquisition of photovoltaic park of 304 MWp capacity"
    • "Heads of Agreement signed to acquire majority ownership of Serbian NIS with SPA expected by the end of Q1 2026"
    • "Halt in Druzhba transit: Bratislava and Danube refineries expected to start processing the first shipments through Adriatic around mid-March, release of strategic reserves sufficient to supply home markets until then"

  Képek:                      MOL logó (jobb alsó sarok)


SLIDE 3 - EREDMÉNYKIMUTATÁS (KÉPES TÁBLÁZAT) (PDF oldal 3, dia szám: 11)
─────────────────────────────────────────────
  Cím (piros):                "FULL YEAR'S NET INCOME REACHED USD 810 MN"
  Szekció fejléc:             "FY 2025 EARNINGS (USD mn) (1) – BELOW THE EBITDA LINE ITEMS"
  Tartalom:                   Beágyazott kép (táblázat PNG-ként)
                              → A táblázat adatai a képben vannak, nem szövegként

  Waterfall chart számértékek (balról jobbra):
    Clean CCS EBITDA:                         3,369
    CCS modifications:                        -321
    EBITDA excl. special items:               3,048
    Special items (EBITDA):                   0
    DD&A and impairments:                     -1,844
    Profit from operation:                    1,204
    Total finance expense/gain, net:          63
    Income from associates:                   65
    Profit before tax:                        1,332
    Income tax expense:                       -402
    Profit for the period:                    930
    Non-controlling interests:                -120
    Profit for the period to equity holders:  810

  Lábjegyzet:                 "(1) Continuing operations unless otherwise noted"

  Képek:                      MOL logó (jobb alsó sarok)


SLIDE 4 - EREDMÉNYKIMUTATÁS (INTERAKTÍV CHART)
─────────────────────────────────────────────
  Cím (piros):                "FULL YEAR'S NET INCOME REACHED USD 810 MN"
  Szekció fejléc:             "FY 2025 EARNINGS (USD mn) (1) – BELOW THE EBITDA LINE ITEMS"
  Tartalom:                   Beágyazott ChartEx (chartEx1.xml)
                              → Waterfall / speciális chart típus
                              → Ugyanazok a számértékek mint Slide 3-ban

  Képek:                      MOL logó (jobb alsó sarok)


SLIDE 5 - EBITDA ALATTI TÉTELEK RÉSZLETEZÉSE (PDF oldal 4, dia szám: 12)
─────────────────────────────────────────────
  Cím (piros):                [1] = "NET FINANCIALS NEUTRAL TO RESULTS AS HUF STRENGTHENS"

  5 szekció, mindegyik chart + kommentár párossal:

  1. Szekció fejléc:          "Clean CCS effect, gain / loss (USD mn)"
     Chart:                   Halmozott oszlopdiagram (chart1.xml)
                              Q4 2024: -89 | Q3 2025: -90 | Q4 2025: -144
     Kommentár:               [2] = "Clean CCS adjustment negative driven by lower oil price environment"

  2. Szekció fejléc:          "DD&A (USD mn)"
     Chart:                   Halmozott oszlopdiagram (chart2.xml)
                              Q4 2024: 429 | Q3 2025: 404 | Q4 2025: 690
     Kommentár:               [3] = "DD&A driven higher than usual USD 400-450 mn by goodwill impairment on ACG and asset impairment on Polish operation of Consumer Services"

  3. Szekció fejléc:          "Total Financial expense (+) / gain (-) (USD mn)"
     Chart:                   Halmozott oszlopdiagram (chart3.xml)
                              Q4 2024: 106 | Q3 2025: -6 | Q4 2025: -1
     Kommentár:               [4] = "Net financials neutral to results as HUF showed slight appreciation in Q4 2025"

  4. Szekció fejléc:          "Income from associates (USD mn)"
     Chart:                   Halmozott oszlopdiagram (chart4.xml)
                              Q4 2024: 23 | Q3 2025: 17 | Q4 2025: 3
     Kommentár:               [5] = "Income from associates decreased to USD 3 mn due to Pearl's gain offset by small decreases in other ventures"

  5. Szekció fejléc:          "Income tax expenses (USD mn)"
     Chart:                   Halmozott oszlopdiagram (chart5.xml)
                              Q4 2024: 100 | Q3 2025: 164 | Q4 2025: -23
     Kommentár:               [6] = "Tax expense supported results by USD 23 mn due to deferred tax income of USD 105 mn"
     Extra adat:              Deferred tax értékek: 31, 18, -105

  Jobb oldali fejléc:         "Comments"

  Képek:                      MOL logó (jobb alsó sarok)


SLIDE 6 - OPERATÍV CASH FLOW (PDF oldal 5, dia szám: 13)
─────────────────────────────────────────────
  Cím (piros):                [1] = "OPERATING CASH FLOW INCREASED TO USD ~2.8 BN YEAR-ON-YEAR"
  Alcím:                      [2] = "OPERATING CASH FLOW COVERS ~1.7X ORGANIC CAPEX OVER FULL YEAR 2025"

  Szekció fejléc:             "OPERATING CASH FLOW FOR TOTAL OPERATION IN FY 2025 (USD mn) (1)"
  Tartalom:                   Beágyazott ChartEx (chartEx2.xml)
                              → Waterfall / speciális chart típus

  Waterfall chart számértékek (balról jobbra):
    Profit before tax Cont. Operation:        1,332
    DD&A:                                     1,844
    Income tax paid:                          -565
    Other:                                    12
    Operating CF before WC:                   2,623
    Change in WC:                             175
    Operating CF:                             2,798
    Organic CAPEX:                            1,653

  Szekció fejléc:             "COMMENTS"
  Szöveges blokk:             [3] =
    • "Operating cash flow before working capital above USD 2.6 mn in FY 2025"
    • "FY 2025 NWC release of USD 175 mn"
    • "Operating Cash Flow after working capital at USD ~2.8 bn, well above FY organic CAPEX of USD 1.65 bn"

  Lábjegyzet:                 "(1) Continuing operations unless otherwise noted"

  Képek:                      MOL logó (jobb alsó sarok)


SLIDE 7 - ADÓSSÁG ÉS TŐKEÁTTÉTEL (PDF oldal 6, dia szám: 14)
─────────────────────────────────────────────
  Cím (piros):                [1] = "NET DEBT HOLDS UNDER 0.5X EBITDA, STRONGER YOY"
  Alcím:                      [2] = "SOLID LEVERAGE PROFILE SUPPORTS BALANCE SHEET FLEXIBILITY"

  Bal felső chart:
    Szekció fejléc:           "NET DEBT TO EBITDA (x)"
    Chart:                    Csoportos oszlopdiagram (chart6.xml)
    Historikus adatsor:
      2014: 1.31 | 2015: 0.74 | 2016: 0.97 | 2017: 0.65 | 2018: 0.41
      2019: 0.82 | 2020: 1.61 | 2021: 0.65 | 2022: 0.30 | 2023: 0.59
      2024: 0.74 | Q1 2025: 0.64 | Q2 2025: 0.69 | Q3 2025: 0.45
      Q4 2025: 0.47

  Jobb felső chart:
    Szekció fejléc:           "GEARING (%)"
    Chart:                    Csoportos oszlopdiagram (chart7.xml)
    Historikus adatsor:
      2015: 20.6 | 2016: 25.2 | 2017: 17.5 | 2018: 12.0 | 2019: 18.6
      2020: 27.3 | 2021: 18.1 | 2022: 11.4 | 2023: 14.0 | 2024: 14.9
      Q1 2025: 13.4 | Q2 2025: 13.9 | Q3 2025: 9.5 | Q4 2025: 10.0

  Bal alsó:
    Szekció fejléc:           "CHANGES IN NET DEBT IN FY 2025 (USD mn)"
    Tartalom:                 Beágyazott ChartEx (chartEx3.xml)
    Waterfall chart számértékek (balról jobbra):
      Net debt 31 Dec 2024:                   2,065
      Simplified FCF:                         -1,716
      Change in WC:                           -175
      Acquisitions:                           +34
      Dividend payout:                        +616
      Income tax paid:                        +565
      Other:                                  +152
      Net debt 31 Dec 2025:                   1,541

  Jobb alsó kommentárok:
    Szekció fejléc:           "COMMENTS"
    ► "Net debt fell by over USD 500 mn with improved operating cash flows year-on-year"
    ► "Net debt to EBITDA and gearing ratios improved to 0.47x and 10%, respectively"

  Lábléc:                     "► MOLGROUP | 14"


SLIDE 8 - UPSTREAM: OPERATIONAL UPDATE (PDF oldal 7, dia szám: 34)
─────────────────────────────────────────────
  Cím (piros):                "UPSTREAM: OPERATIONAL UPDATE (1)"

  ── BAL OLDAL ──

  HUNGARY (piros fejléc)
    EXPLORATION:                    [1] = "Isaszeg-Ny-1 Well cased and completed. Cased-hole test resulted in water inflow. Well is dry, P&A in progress"
    FIELD DEVELOPMENT:              [2] =
                                    • "Körösújfalu-EGR project was continued"
                                    • "Kőrös-8 well-tie in was completed and in production from Dec"
    PRODUCTION OPTIMIZATION:        [3] = "14 well workovers have been completed"
    GEOTHERMAL:                     [4] = "Geothermal: seismic processing started at Százhalombatta, work is progressing on heat-utilization opportunities at Kálócfa and Ócsa–Nagykáta"
    Megjegyzés: A PDF-ben ez a szekció "GEOTHERMAL" címkével szerepel (a sablon "OTHER"-t használ)

  AZERBAIJAN (piros fejléc)
    Szöveges blokk:                 [9] =
                                    • "ACG production is higher due to new wells put into production, and the oil price impact on the entitlement"
                                    • "Drilling activities are ongoing"
                                    • "MOL Group and SOCAR signed major onshore Exploration and Production Sharing Agreement for the Shamakhi-Gobustan region in Azerbaijan, with MOL as Operator (65%) and SOCAR (35%)"

  ── JOBB OLDAL ──

  CROATIA (piros fejléc)
    FIELD DEVELOPMENT AND PRODUCTION: [6] =
                                    • "Međimurje-7 well drilling: Spud in Dec, drilling is ongoing"
                                    • "Zalata-Dravica: Land easement process along Dravica Gas Station – Kalinovac Gas Station gas pipeline route ongoing"
    PRODUCTION OPTIMIZATION:        [7] = "12 well workovers performed on onshore fields"
    GEOTHERMAL:                     [8] = "Leščan: license injectivity test technical program preparation has started"
    OFFSHORE CAMPAIGN:              [5] =
                                    • "Ika A-1 well: Drilling, completion and tie-in operations have been completed. Production started in Dec"
                                    • "Ika A-4 well: Drilling phase finalized, completion phase is ongoing"
    Megjegyzés: A PDF-ben nincs "EXPLORATION" szekció Horvátországnál; helyette "OFFSHORE CAMPAIGN" szerepel, ami [5]-re van mappelve

  EGYPT (piros fejléc)
    Szöveges blokk:                 [10] =
                                    • "Well workover activities have been performed in Ras Qattara (2)"
                                    • "In North Bahariya, 4 development wells were drilled; in Ras Qattara 1 well was completed and drilling began on another; and in West Abu Gharadig 1 well was drilled"

  Képek:                      Zászló ikonok (Magyarország, Horvátország,
                              Azerbajdzsán, Egyiptom) + MOL logó
`;

const FILE_PARSERS: Record<string, FileParser> = {
    '.txt': async (content) => content,

    '.pdf': async () => {
        throw new Error(
            'PDF parsing is not yet implemented. Please convert to .txt first.',
        );
    },

    '.xlsx': async () => '',

    '.docx': async () => TEMPORARY_FIXED_CONTENT,
};

export const SUPPORTED_FILE_EXTENSIONS = Object.keys(FILE_PARSERS);

export async function parseFileContent(
    content: string,
    fileName: string,
): Promise<string> {
    const ext = path.extname(fileName).toLowerCase();
    const parser = FILE_PARSERS[ext];

    if (!parser) {
        throw new Error(
            `Unsupported file type "${ext}". Supported: ${SUPPORTED_FILE_EXTENSIONS.join(', ')}`,
        );
    }

    return parser(content);
}
