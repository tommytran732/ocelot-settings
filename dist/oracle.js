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
    function wheatPrefers(potentialMatch, currMatch, preferences) {
        return preferences.indexOf(potentialMatch) < preferences.indexOf(currMatch);
    }
    function chaffPrefers(potentialMatch, currMatch, preferences) {
        return preferences.indexOf(potentialMatch) > preferences.indexOf(currMatch);
    }
    function traceCode(prefersFn) {
        return function (companies, candidates) {
            const maxIterations = Infinity;
            const preferComp = true;
            const randomPreference = false;
            const randomProposer = false;
            const forwardProposer = false;
            let currIterations = 0;
            const hires = [];
            const trace = [];
            const n = companies.length;
            const copyPreferences = (list) => list.reduce((acc, elem) => { acc.push(elem.slice(0, elem.length)); return acc; }, []);
            const comp = copyPreferences(companies);
            const cand = copyPreferences(candidates);
            class Queue {
                constructor(list) {
                    this.copy = list.slice(0, list.length);
                }
                pop() { return this.copy.shift(); }
                isEmpty() { return this.copy.length === 0; }
            }
            function offer(from, to, fromCo) {
                return { from: from, to: to, fromCo: fromCo };
            }
            function hireFromOffer(o) {
                return obj.hire(o.fromCo ? o.from : o.to, o.fromCo ? o.to : o.from);
            }
            function makeProposalQueues(preferences) {
                return preferences.reduce((acc, elem) => { acc.push(new Queue(elem)); return acc; }, []);
            }
            function allEmpty(queues) {
                return queues.reduce((acc, elem) => acc && elem.isEmpty(), true);
            }
            const compQueues = makeProposalQueues(comp);
            const candQueues = makeProposalQueues(cand);
            function findHire(id, isComp) {
                const check = (elem) => isComp ? elem.company === id : elem.candidate === id;
                return hires.reduce((acc, elem) => acc.found ? acc
                    : (check(elem) ? { found: true, index: acc.index }
                        : { found: false, index: acc.index + 1 }), { found: false, index: 0 });
            }
            function getHire(id, isComp) {
                const location = findHire(id, isComp);
                return { found: location.found, hire: location.found ? hires[location.index] : {} };
            }
            function canPropose(id, isComp) {
                return !findHire(id, isComp).found;
            }
            function range(start, end) {
                const array = [];
                for (let i = start; i < end; ++i) {
                    array.push(i);
                }
                return array;
            }
            function randomInt(min, max) {
                return Math.floor(Math.random() * (max - min)) + min;
            }
            function randomElement(list) {
                return list.length === 0 ? undefined : list[randomInt(0, list.length)];
            }
            function getValidProposers(isComp) {
                return range(0, n).filter((elem) => canPropose(elem, isComp)).filter(elem => isComp
                    ? !compQueues[elem].isEmpty()
                    : !candQueues[elem].isEmpty());
            }
            function getNextProposal() {
                let first = comp;
                let second = cand;
                let firstQueues = compQueues;
                let secondQueues = candQueues;
                let compFirst = true;
                if (!preferComp && randomPreference && Math.random() < 0.5) {
                    first = cand;
                    second = comp;
                    firstQueues = candQueues;
                    secondQueues = compQueues;
                    compFirst = false;
                }
                const validFirsts = getValidProposers(compFirst);
                const validSeconds = getValidProposers(!compFirst);
                if (validFirsts.length !== 0) {
                    const proposer = randomProposer ? randomElement(validFirsts)
                        : (forwardProposer ? validFirsts[0]
                            : validFirsts[validFirsts.length - 1]);
                    return { found: true, offer: offer(proposer, firstQueues[proposer].pop(), compFirst) };
                }
                else if (validSeconds.length !== 0) {
                    const proposer = randomProposer ? randomElement(validSeconds)
                        : (forwardProposer ? validSeconds[0]
                            : validSeconds[validSeconds.length - 1]);
                    return { found: true, offer: offer(proposer, secondQueues[proposer].pop(), !compFirst) };
                }
                else {
                    return { found: false };
                }
            }
            function updateHires(proposal) {
                const currHire = getHire(proposal.to, !proposal.fromCo);
                if (!currHire.found) {
                    hires.push(obj.hire(proposal.fromCo ? proposal.from : proposal.to, proposal.fromCo ? proposal.to : proposal.from));
                }
                else if (prefersFn(proposal.from, !proposal.fromCo ? currHire.hire.candidate : currHire.hire.company, !proposal.fromCo ? comp[proposal.to] : cand[proposal.to])) {
                    if (proposal.fromCo) {
                        currHire.hire.company = proposal.from;
                    }
                    else {
                        currHire.hire.candidate = proposal.from;
                    }
                }
            }
            while (currIterations < maxIterations &&
                (!allEmpty(compQueues) || !allEmpty(candQueues)) &&
                hires.length !== n) {
                const proposal = getNextProposal();
                if (!proposal.found) {
                    break;
                }
                trace.push(proposal.offer);
                updateHires(proposal.offer);
                ++currIterations;
            }
            return { trace: config.stopifyArray(trace), out: config.stopifyArray(hires) };
        };
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
        },
        traceWheat1: traceCode(wheatPrefers),
        traceChaff1: traceCode(chaffPrefers)
    };
    return obj;
}
