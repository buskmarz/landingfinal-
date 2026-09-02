(() => {
  const presets = {
    brew: { ingredients: 5.5, packaging: 5.5, secondaryPackaging: 0.8, labor: 2.5, process: 1.5, coldChain: 1.5, storage: 0.3, quality: 1.5, variableMarketing: 0.4, returns: 0.2, waste: 5, testPrice: 59 },
    matcha: { ingredients: 7.5, packaging: 5.5, secondaryPackaging: 0.8, labor: 2.5, process: 1.5, coldChain: 1.5, storage: 0.3, quality: 1.5, variableMarketing: 0.4, returns: 0.2, waste: 5, testPrice: 69 },
    flower: { ingredients: 5.5, packaging: 5.5, secondaryPackaging: 0.8, labor: 2.5, process: 1.5, coldChain: 1.5, storage: 0.3, quality: 1.5, variableMarketing: 0.4, returns: 0.2, waste: 5, testPrice: 65 }
  };

  const form = document.querySelector("#pricing-calculator");
  if (!form) return;

  const fields = {
    product: document.querySelector("#product"),
    ingredients: document.querySelector("#ingredients"),
    packaging: document.querySelector("#packaging"),
    secondaryPackaging: document.querySelector("#secondaryPackaging"),
    labor: document.querySelector("#labor"),
    process: document.querySelector("#process"),
    coldChain: document.querySelector("#coldChain"),
    storage: document.querySelector("#storage"),
    quality: document.querySelector("#quality"),
    variableMarketing: document.querySelector("#variableMarketing"),
    returns: document.querySelector("#returns"),
    waste: document.querySelector("#waste"),
    targetMargin: document.querySelector("#targetMargin"),
    channelFee: document.querySelector("#channelFee"),
    tax: document.querySelector("#tax"),
    specificTax: document.querySelector("#specificTax"),
    testPrice: document.querySelector("#testPrice"),
    fixedMonthly: document.querySelector("#fixedMonthly"),
    monthlyVolume: document.querySelector("#monthlyVolume"),
    initialInvestment: document.querySelector("#initialInvestment")
  };

  const output = {
    unitCost: document.querySelector("#unitCost"),
    recommendedPrice: document.querySelector("#recommendedPrice"),
    actualMargin: document.querySelector("#actualMargin"),
    grossProfit: document.querySelector("#grossProfit"),
    breakEvenUnits: document.querySelector("#breakEvenUnits"),
    monthlyContribution: document.querySelector("#monthlyContribution"),
    recoveryMonths: document.querySelector("#recoveryMonths"),
    signal: document.querySelector("#price-signal")
  };

  const value = (field) => Math.max(0, Number.parseFloat(field.value) || 0);
  const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

  function calculate() {
    const baseCost = value(fields.ingredients) + value(fields.packaging) + value(fields.secondaryPackaging) + value(fields.labor) + value(fields.process) + value(fields.coldChain) + value(fields.storage) + value(fields.quality) + value(fields.variableMarketing) + value(fields.returns);
    const unitCost = baseCost * (1 + value(fields.waste) / 100);
    const marginTarget = Math.min(0.95, value(fields.targetMargin) / 100);
    const channel = Math.min(0.8, value(fields.channelFee) / 100);
    const tax = value(fields.tax) / 100;
    const specificTax = value(fields.specificTax);
    const totalVariableCost = unitCost + specificTax;
    const testPrice = value(fields.testPrice);
    const denominator = Math.max(0.01, (1 - marginTarget) * (1 - channel));
    const recommendedPrice = totalVariableCost / denominator * (1 + tax);
    const revenueBeforeTax = testPrice / (1 + tax);
    const revenueAfterChannel = revenueBeforeTax * (1 - channel);
    const grossProfit = revenueAfterChannel - totalVariableCost;
    const actualMargin = revenueAfterChannel > 0 ? grossProfit / revenueAfterChannel : 0;
    const fixedMonthly = value(fields.fixedMonthly);
    const monthlyVolume = value(fields.monthlyVolume);
    const initialInvestment = value(fields.initialInvestment);
    const breakEvenUnits = grossProfit > 0 ? Math.ceil(fixedMonthly / grossProfit) : 0;
    const monthlyContribution = grossProfit * monthlyVolume - fixedMonthly;
    const recoveryMonths = initialInvestment > 0 && monthlyContribution > 0 ? initialInvestment / monthlyContribution : 0;

    output.unitCost.textContent = money.format(totalVariableCost);
    output.recommendedPrice.textContent = money.format(recommendedPrice);
    output.actualMargin.textContent = `${Math.round(actualMargin * 100)}%`;
    output.grossProfit.textContent = money.format(grossProfit);
    output.breakEvenUnits.textContent = grossProfit > 0 ? `${breakEvenUnits} u.` : "No viable";
    output.monthlyContribution.textContent = money.format(monthlyContribution);
    output.recoveryMonths.textContent = recoveryMonths > 0 ? `${recoveryMonths.toFixed(1)} meses` : "—";

    if (totalVariableCost > 21) {
      output.signal.textContent = "REVISAR: el costo supera la meta inicial de $18–$21 por botella; el rango de mercado puede no sostener el margen deseado.";
    } else if (actualMargin >= marginTarget) {
      output.signal.textContent = "ESCENARIO VIABLE: el precio de prueba alcanza el margen configurado. Falta sustituir todas las hipótesis por cotizaciones reales.";
    } else {
      output.signal.textContent = "AJUSTAR: el precio de prueba no alcanza el margen configurado. Reduce costo, cambia el margen o valida un precio mayor con clientes reales.";
    }
  }

  function applyPreset() {
    const preset = presets[fields.product.value];
    Object.entries(preset).forEach(([key, number]) => { fields[key].value = number; });
  }

  fields.product.addEventListener("change", () => {
    applyPreset();
    calculate();
  });
  form.addEventListener("input", calculate);
  applyPreset();
  calculate();
})();
