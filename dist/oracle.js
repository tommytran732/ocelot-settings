function oracle(config) {
    function prefers(company1, company2, candidate, candidates) {
        return candidates[candidate].indexOf(company1) < candidates[candidate].indexOf(company2);
    }
    function getCompanyIndex(company, hires) {
        for (let i = 0; i < hires.length; ++i) {
            if (hires[i].company === company) {
                return i;
            }
        }
        return -1;
    }
    function unHire(company, hires, hasHired) {
        hasHired[company] = false;
        hires.splice(getCompanyIndex(company, hires), 1);
    }
    function getCompany(candidateNum, hires) {
        for (let i = 0; i < hires.length; ++i) {
            if (hires[i].candidate === candidateNum) {
                return hires[i].company;
            }
        }
        return -1;
    }
    const obj = {
        hire: (comp, cand) => {
            return { company: comp, candidate: cand };
        },
        wheat1: function (companies, candidates) {
            const n = companies.length, hires = [];
            const hasHired = Array(n).fill(false), wasHired = Array(n).fill(false);
            const proposalCounts = Array(n).fill(0);
            let nextCompany = hasHired.indexOf(false);
            while (nextCompany !== -1) {
                const preferredCandidate = companies[nextCompany][proposalCounts[nextCompany]];
                if (!wasHired[preferredCandidate]) {
                    wasHired[preferredCandidate] = true;
                    hasHired[nextCompany] = true;
                    hires.push(obj.hire(nextCompany, preferredCandidate));
                }
                else {
                    const competitor = getCompany(preferredCandidate, hires);
                    if (prefers(nextCompany, competitor, preferredCandidate, candidates)) {
                        unHire(competitor, hires, hasHired);
                        hasHired[nextCompany] = true;
                        hires.push(obj.hire(nextCompany, preferredCandidate));
                    }
                }
                ++proposalCounts[nextCompany];
                nextCompany = hasHired.indexOf(false);
            }
            return config.stopifyArray(hires);
        },
        chaff1: function (companies) {
            return companies.reduce((acc, x) => {
                acc.hires.push(obj.hire(acc.n, acc.n));
                ++acc.n;
                return acc;
            }, {
                hires: config.stopifyArray([]),
                n: 0
            }).hires;
        }
    };
    return obj;
}
