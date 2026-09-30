/* 선수 사진 얼굴 크롭 보정값: [중심 x(폭 비율), 중심 y(높이 비율), 크기(폭 비율)] — tools/photo-check.html 로 점검 */
(function (root) {
  var F = root.FPRD = root.FPRD || {};
  F.PHOTO_CROPS = {
    dembele: [0.46, 0.22, 0.6],
    mbappe: [0.5, 0.23, 0.6],
    palmer: [0.5, 0.2, 0.78],
    lewandowski: [0.45, 0.28, 0.75],
    valverde: [0.44, 0.37, 0.56],
    kvaratskhelia: [0.46, 0.19, 0.5],
    maradona: [0.37, 0.22, 0.52],
    luis_diaz: [0.43, 0.2, 0.52],
    gyokeres: [0.5, 0.19, 0.62],
    van_dijk: [0.5, 0.23, 0.62],
    guirassy: [0.5, 0.2, 0.55],
    dumfries: [0.55, 0.22, 0.5],
    pacho: [0.5, 0.17, 0.45],
    enzo: [0.5, 0.34, 0.8],
    // 레전드
    zidane: [0.49, 0.4, 0.86],
    van_basten: [0.51, 0.42, 0.88],
    ronaldo_nazario: [0.5, 0.36, 0.88],
    iniesta: [0.32, 0.47, 0.44],
    yashin: [0.49, 0.36, 0.56],
    di_stefano: [0.53, 0.14, 0.34],
    platini: [0.51, 0.39, 0.84],
    garrincha: [0.56, 0.12, 0.32],
    charlton: [0.51, 0.31, 0.7],
    matthaus: [0.5, 0.28, 0.52]
  };
})(typeof window !== 'undefined' ? window : globalThis);
