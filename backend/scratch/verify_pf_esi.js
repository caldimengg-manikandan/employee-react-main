
function calculate(oldGross, oldPF, oldESI, factor) {
    const newGross = Math.round(oldGross * factor);
    const newPF = (oldGross <= 21000 && newGross > 21000) ? 3750 : oldPF;
    const newESI = newGross > 21000 ? 0 : Math.round(oldESI * factor);
    const newNet = newGross - newPF - newESI;
    return { newGross, newPF, newESI, newNet };
}

console.log("--- SCENARIO 1: Crossing Threshold ---");
// Old Gross 18k, Old PF 2160 (12%), Old ESI 135 (0.75%), Factor 1.2 (+20%)
const s1 = calculate(18000, 2160, 135, 1.2);
console.log(s1); 
// Expected: newGross 21600, newPF 3750 (crossed!), newESI 0 (above 21k)

console.log("\n--- SCENARIO 2: Already Above ---");
// Old Gross 60.5k, Old PF 7000, Old ESI 0, Factor 1.1 (+10%)
const s2 = calculate(60500, 7000, 0, 1.1);
console.log(s2);
// Expected: newGross 66550, newPF 7000 (remains same!), newESI 0

console.log("\n--- SCENARIO 3: Below Threshold ---");
// Old Gross 15k, Old PF 1800, Old ESI 112, Factor 1.1 (+10%)
const s3 = calculate(15000, 1800, 112, 1.1);
console.log(s3);
// Expected: newGross 16500, newPF 1800 (not crossed), newESI 123 (scaled)
