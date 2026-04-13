
const baseCtc = 60500;
const revisedCtc = 66550;
const rawBasic = 21000;
const rawHra = 15000;
const rawSpecial = 15000;
const rawGratuity = 1000;
const rawCtc = rawBasic + rawHra + rawSpecial + rawGratuity;
const pf = 7000;

const normFactor = baseCtc / rawCtc;
const factor = revisedCtc / baseCtc;

const salaryOld = {
    basic: Math.round(rawBasic * normFactor),
    hra: Math.round(rawHra * normFactor),
    special: Math.round(rawSpecial * normFactor),
    gross: Math.round((rawBasic + rawHra + rawSpecial) * normFactor),
    empPF: pf,
    net: Math.round(((rawBasic + rawHra + rawSpecial) * normFactor) - pf),
    ctc: baseCtc
};

const salaryNew = {
    basic: Math.round(salaryOld.basic * factor),
    hra: Math.round(salaryOld.hra * factor),
    special: Math.round(salaryOld.special * factor),
    gross: Math.round(salaryOld.gross * factor),
    empPF: pf,
    net: Math.round(salaryOld.gross * factor) - pf,
    ctc: revisedCtc
};

console.log("OLD:", salaryOld);
console.log("NEW:", salaryNew);

if (salaryNew.net === (salaryNew.gross - salaryNew.empPF)) {
    console.log("SUCCESS: Net equals Gross - PF");
} else {
    console.log("FAILURE: Net doesn't match Gross - PF");
}
