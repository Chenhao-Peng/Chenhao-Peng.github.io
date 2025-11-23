// Helmholtz coil field calculator (browser version).
// Units: x,y,z,R in cm; V in volts; Omega in ohms; output Tesla.

(() => {
  const mu0 = 4 * Math.PI * 1e-7;

  // Complete elliptic integrals of the first (K) and second (E) kind via AGM.
  function ellipticKE(m) {
    if (m < 0 || m >= 1) {
      throw new Error("参数 m 必须在 [0, 1) 内");
    }
    let a = 1;
    let b = Math.sqrt(1 - m);
    let c = a - b;
    let sum = 0;
    let pow = 1;
    const tol = 1e-14;
    while (Math.abs(c) > tol * a) {
      const an = (a + b) / 2;
      const bn = Math.sqrt(a * b);
      c = (a - b) / 2;
      sum += pow * c * c;
      pow *= 2;
      a = an;
      b = bn;
    }
    const K = Math.PI / (2 * a);
    const E = K * (1 - sum);
    return { K, E };
  }

  function helmholtzField(x_cm, y_cm, z_cm, R_cm, V, Omega, N) {
    const x = x_cm * 1e-2;
    const y = y_cm * 1e-2;
    const z = z_cm * 1e-2;
    const R = R_cm * 1e-2;
    const I = V / Omega;
    const centers = [-R / 2, R / 2];

    function loopField(xp, yp, zp, a, x0) {
      const rho = Math.hypot(yp, zp);
      const zax = xp - x0;

      if (rho === 0) {
        const bx = (mu0 * I * N * a * a) / (2 * Math.pow(a * a + zax * zax, 1.5));
        return [bx, 0, 0];
      }

      const denom2 = Math.pow(a + rho, 2) + zax * zax;
      const kSq = (4 * a * rho) / denom2;
      const { K, E } = ellipticKE(kSq);
      const denom = Math.sqrt(denom2);
      const factor = (mu0 * I * N) / (2 * Math.PI * denom);
      const rho2 = rho * rho;
      const z2 = zax * zax;
      const aMinusRho2 = Math.pow(a - rho, 2);

      const bRho =
        factor *
        (zax / rho) *
        (-K + ((a * a + rho2 + z2) / (aMinusRho2 + z2)) * E);
      const bX =
        factor *
        (K + ((a * a - rho2 - z2) / (aMinusRho2 + z2)) * E);

      const cosPhi = yp / rho;
      const sinPhi = zp / rho;
      const bY = bRho * cosPhi;
      const bZ = bRho * sinPhi;
      return [bX, bY, bZ];
    }

    const b = centers
      .map((c) => loopField(x, y, z, R, c))
      .reduce((acc, cur) => [acc[0] + cur[0], acc[1] + cur[1], acc[2] + cur[2]], [0, 0, 0]);
    return b;
  }

  function toSci(num) {
    if (!isFinite(num)) return "NaN";
    return num.toExponential(6);
  }

  function $(id) {
    return document.getElementById(id);
  }

  function showError(msg) {
    $("hh-error").textContent = msg || "";
  }

  function main() {
    const btn = $("hh-run");
    const out = $("hh-output");
    btn.addEventListener("click", () => {
      showError("");
      const x = parseFloat($("hh-x").value);
      const y = parseFloat($("hh-y").value);
      const z = parseFloat($("hh-z").value);
      const R = parseFloat($("hh-R").value);
      const V = parseFloat($("hh-V").value);
      const Omega = parseFloat($("hh-omega").value);
      const N = parseInt($("hh-N").value, 10);

      if ([x, y, z, R, V, Omega, N].some((v) => Number.isNaN(v))) {
        showError("请填写所有输入。");
        return;
      }
      if (R <= 0) {
        showError("R 必须大于 0");
        return;
      }
      if (Omega <= 0) {
        showError("电阻必须大于 0");
        return;
      }
      if (N <= 0) {
        showError("匝数 N 必须为正整数");
        return;
      }
      try {
        const [bx, by, bz] = helmholtzField(x, y, z, R, V, Omega, N);
        const bmag = Math.hypot(bx, by, bz);
        out.textContent = `B = [${toSci(bx)}, ${toSci(by)}, ${toSci(bz)}] T\n|B| = ${toSci(bmag)} T`;
      } catch (err) {
        showError(err.message || "计算出错");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
