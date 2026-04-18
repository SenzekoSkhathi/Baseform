/**
 * Canonical logo URLs keyed by university short_name/abbreviation.
 * This file is the single source of truth — Supabase logo_url values are
 * intentionally ignored.
 * Sources: Wikimedia Commons (stable public CDN).
 */
export const UNIVERSITY_LOGOS: Record<string, string> = {
  UCT:   "https://upload.wikimedia.org/wikipedia/en/thumb/7/7c/University_of_Cape_Town_logo.svg/250px-University_of_Cape_Town_logo.svg.png",
  SU:    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Stellenbosch_University_New_Logo.jpg/250px-Stellenbosch_University_New_Logo.jpg",
  UP:    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/University_of_Pretoria_Coat_of_Arms.png/250px-University_of_Pretoria_Coat_of_Arms.png",
  UWC:   "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/UWC_Logo.svg/250px-UWC_Logo.svg.png",
  CPUT:  "https://upload.wikimedia.org/wikipedia/en/thumb/b/ba/CPUT_logo.svg/250px-CPUT_logo.svg.png",
  NWU:   "https://upload.wikimedia.org/wikipedia/en/thumb/e/ec/North-West_University_logo.svg/250px-North-West_University_logo.svg.png",
  WITS:  "https://upload.wikimedia.org/wikipedia/en/thumb/c/c7/Logo_for_the_University_of_the_Witwatersrand%2C_Johannesburg_%28new_logo_as_of_2015%29.jpg/250px-Logo_for_the_University_of_the_Witwatersrand%2C_Johannesburg_%28new_logo_as_of_2015%29.jpg",
  UJ:    "https://upload.wikimedia.org/wikipedia/en/thumb/a/af/University_of_Johannesburg_Logo.svg/250px-University_of_Johannesburg_Logo.svg.png",
  UKZN:  "https://upload.wikimedia.org/wikipedia/en/thumb/b/be/UKZN_logo.svg/250px-UKZN_logo.svg.png",
  DUT:   "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/The_Durban_University_of_Technology_new_log.jpg/250px-The_Durban_University_of_Technology_new_log.jpg",
  TUT:   "https://upload.wikimedia.org/wikipedia/en/thumb/4/49/Tshwane_University_of_Technology_logo.svg/250px-Tshwane_University_of_Technology_logo.svg.png",
  UFH:   "https://tenderbulletins.co.za/wp-content/uploads/2019/11/University-of-Fort-Hare.png",
  WSU:   "https://www.skillsportal.co.za/sites/default/files/styles/max_325x325/public/2023-02/wsu_logo.jpg?itok=uEYtTukC",
  UL:    "https://veldfiremedia.com/wp-content/uploads/2022/12/UL-logo-1200x620-1.png",
  UMP:   "https://studentroom.co.za/wiki/wp-content/uploads/2020/12/University-of-Mpumalanga-UMP-logo-1024x536.png",
  UNISA: "https://sagea.org.za/wp-content/uploads/2022/03/SAGEA_affiliate-logos40_Unisa-862x465.png",
  NMU:   "https://sagea.org.za/wp-content/uploads/2020/12/SAGEA_affiliate-logos27-862x465.png",
  MUT:   "https://sagea.org.za/wp-content/uploads/2023/06/MUT-2048x1104.png",
  VUT:   "https://www.itweb.co.za/static/office/vaaluniversityoftechnology/images/logo-10-2021.jpg",
  UFS:   "https://sagea.org.za/wp-content/uploads/2022/03/University-of-Free-State-1200x647.png",
  UNIVEN:"https://www.univen.ac.za/docs/univen-logo.jpg",
  CUT:   "https://cms.cut.ac.za/Files/Froala/1fe976e3-b12d-49a3-9fca-461f917eadb1.jpg",
  SPU:   "https://studentroom.co.za/wiki/wp-content/uploads/2020/12/Sol_Plaatje_University_logo-768x402.png",
  UZ:    "https://media.cdn.gradconnection.com/uploads/University-of-Zululand.jpeg",
  UNIZULU: "https://media.cdn.gradconnection.com/uploads/University-of-Zululand.jpeg",
  SMU:   "https://i1.rgstatic.net/ii/institution.image/AS:267486501507073%401440785159072_l",
  RU:    "https://veldfiremedia.com/wp-content/uploads/2022/12/Rhodes-logo-1200x620-1.png",
  CAO:   "https://images.sftcdn.net/images/t_app-icon-m/p/81b09129-b72a-4665-908b-05f3c1c3400f/2129638517/central-applications-office-logo",
};

/**
 * Returns a logo URL for a university based solely on the static map above.
 * The second argument is kept for call-site compatibility but is ignored —
 * Supabase-stored logo URLs are no longer consulted.
 */
export function getUniversityLogo(abbreviation: string, _dbLogoUrl?: string | null): string | null {
  return UNIVERSITY_LOGOS[abbreviation.toUpperCase()] ?? null;
}
