// N-turn single circular coil field + gradient calculator.
// Units: inputs x,y,z,R in cm, I in A, Omega in ohms; outputs Tesla and T/m.

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

  // Magnetic field of a circular loop centered at origin with axis along x.
  function loopFieldMeters(x, y, z, R, I, N) {
    const rho = Math.hypot(y, z);
    const x2 = x * x;

    if (rho === 0) {
      const bx = (mu0 * I * N * R * R) / (2 * Math.pow(R * R + x2, 1.5));
      return [bx, 0, 0];
    }

    const denom2 = Math.pow(R + rho, 2) + x2;
    const kSqRaw = (4 * R * rho) / denom2;
    const kSq = Math.min(1 - 1e-14, Math.max(0, kSqRaw));
    const { K, E } = ellipticKE(kSq);
    const denom = Math.sqrt(denom2);
    const factor = (mu0 * I * N) / (2 * Math.PI * denom);
    const rho2 = rho * rho;
    const aMinusRho2 = Math.pow(R - rho, 2);

    const bRho =
      factor *
      (x / rho) *
      (-K + ((R * R + rho2 + x2) / (aMinusRho2 + x2)) * E);
    const bX =
      factor *
      (K + ((R * R - rho2 - x2) / (aMinusRho2 + x2)) * E);

    const cosPhi = y / rho;
    const sinPhi = z / rho;
    const bY = bRho * cosPhi;
    const bZ = bRho * sinPhi;
    return [bX, bY, bZ];
  }

  function coilFieldWithGrad(x_cm, y_cm, z_cm, R_cm, I, N) {
    const x = x_cm * 1e-2;
    const y = y_cm * 1e-2;
    const z = z_cm * 1e-2;
    const R = R_cm * 1e-2;

    const baseB = loopFieldMeters(x, y, z, R, I, N);
    const baseMag = Math.hypot(baseB[0], baseB[1], baseB[2]);

    const h = Math.max(1e-5, R * 1e-4 || 0);
    const magAt = (dx, dy, dz) => {
      const [bx, by, bz] = loopFieldMeters(x + dx, y + dy, z + dz, R, I, N);
      return Math.hypot(bx, by, bz);
    };
    const gradX = (magAt(h, 0, 0) - magAt(-h, 0, 0)) / (2 * h);
    const gradY = (magAt(0, h, 0) - magAt(0, -h, 0)) / (2 * h);
    const gradZ = (magAt(0, 0, h) - magAt(0, 0, -h)) / (2 * h);

    return { B: baseB, Bmag: baseMag, grad: [gradX, gradY, gradZ] };
  }

  function toSci(num) {
    if (!isFinite(num)) return "NaN";
    return num.toExponential(6);
  }

  function $(id) {
    return document.getElementById(id);
  }

  function showError(msg) {
    $("sc-error").textContent = msg || "";
  }

  function main() {
    const btn = $("sc-run");
    const out = $("sc-output");
    btn.addEventListener("click", () => {
      showError("");
      const x = parseFloat($("sc-x").value);
      const y = parseFloat($("sc-y").value);
      const z = parseFloat($("sc-z").value);
      const R = parseFloat($("sc-R").value);
      const I = parseFloat($("sc-I").value);
      const Omega = parseFloat($("sc-omega").value);
      const N = parseInt($("sc-N").value, 10);

      if ([x, y, z, R, I, Omega, N].some((v) => Number.isNaN(v))) {
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
        const { B, Bmag, grad } = coilFieldWithGrad(x, y, z, R, I, N);
        const voltage = I * Omega;
        const result = [
          `B = [${toSci(B[0])}, ${toSci(B[1])}, ${toSci(B[2])}] T`,
          `|B| = ${toSci(Bmag)} T`,
          `grad|B| = [${toSci(grad[0])}, ${toSci(grad[1])}, ${toSci(grad[2])}] T/m`,
          `线圈电压 (I·R) ≈ ${toSci(voltage)} V`
        ].join("\n");
        out.textContent = result;
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
