// CONFIGURAÇÃO
const CONFIG = {
    apiKey: "", // Deixe vazio para usar o Mock Mode
    apiUrl: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent",
    mockMode: true // Ativa resposta simulada se não houver API Key
};

// --- DOM ELEMENTS ---
const DOM = {};

function initDOM() {
    DOM.inputClt = document.getElementById('input-clt');
    DOM.inputPj = document.getElementById('input-pj');
    DOM.resClt = document.getElementById('res-clt');
    DOM.resPj = document.getElementById('res-pj');
    DOM.verdict = document.getElementById('verdict');
    DOM.barClt = document.getElementById('bar-clt');
    DOM.barPj = document.getElementById('bar-pj');
    DOM.btnIa = document.getElementById('btn-ia');
    DOM.iaResult = document.getElementById('ia-result');
    DOM.proBtn = document.getElementById('btn-analise-pro');
    DOM.proOptions = document.getElementById('analise-opcoes');
}

// --- UTILS ---

function formatMoney(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseCurrency(value) {
    // Remove tudo que não é dígito, divide por 100 para centavos
    return Number(value.replace(/\D/g, "")) / 100;
}

function formatCurrencyInput(value) {
    // Formata o número cru para visualização BRL
    const number = value.replace(/\D/g, "") / 100;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// --- CORE LOGIC ---

function calculate() {
    // Obtém valores numéricos limpos (data-value ou parse direto se não tiver máscara ainda)
    // Se estivermos usando máscara, o value visual é "R$ 6.000,00", então precisamos limpar
    const cltVal = parseCurrency(DOM.inputClt.value) || 0;
    const pjVal = parseCurrency(DOM.inputPj.value) || 0;

    // Simulação Simplificada
    // CLT: (Salário * 13.33 meses) - ~18% descontos médios (INSS+IR) simplificado
    const cltTotal = (cltVal * 13.33) * 0.82; 
    
    // PJ: (Faturamento * 12) - ~10% impostos (Simples Nacional Anexo III/V médio)
    const pjTotal = (pjVal * 12) * 0.90;

    // Atualiza DOM
    DOM.resClt.innerText = formatMoney(cltTotal);
    DOM.resPj.innerText = formatMoney(pjTotal);

    // Animação das barras
    const max = Math.max(cltTotal, pjTotal) * 1.1 || 1; // Evita divisão por zero
    const cltPercent = (cltTotal / max) * 100;
    const pjPercent = (pjTotal / max) * 100;

    DOM.barClt.style.width = `${cltPercent}%`;
    DOM.barPj.style.width = `${pjPercent}%`;

    if (pjTotal > cltTotal) {
        const diff = pjTotal - cltTotal;
        DOM.verdict.innerHTML = `CNPJ rende aprox. <span class="text-amber-400 font-bold">+${formatMoney(diff)}</span> por ano`;
        DOM.resPj.className = "font-bold text-amber-400 text-lg";
        DOM.barPj.className = "bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-400 h-2 rounded-full transition-all duration-500";
    } else {
        const diff = cltTotal - pjTotal;
        DOM.verdict.innerHTML = `CLT rende aprox. <span class="text-amber-300 font-bold">+${formatMoney(diff)}</span> por ano`;
        DOM.resPj.className = "font-bold text-slate-400 text-lg";
        DOM.barPj.className = "bg-slate-500 h-2 rounded-full transition-all duration-500";
    }
}

// --- EVENT HANDLERS ---

function setupInputs() {
    const inputs = [DOM.inputClt, DOM.inputPj];
    
    inputs.forEach(el => {
        // Inicializa com formatação
        // O valor inicial no HTML é numérico puro (ex: 6000). Vamos formatar ao carregar.
        if(el.value && !el.value.includes('R$')) {
            el.value = (parseFloat(el.value)).toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' });
        }

        el.addEventListener('input', (e) => {
            let value = e.target.value;
            
            // Garante que o cursor não pule loucamente (básico)
            if (value === '') value = '0';
            
            // Aplica máscara
            e.target.value = formatCurrencyInput(value);
            
            // Recalcula
            calculate();
        });
    });
}

function handleAndroidClick() {
    alert("📢 Lista de Espera\n\nEstamos finalizando a versão Android! Cadastramos seu interesse (simulado).");
}

// --- AI LOGIC ---

async function fetchWithExponentialBackoff(url, options, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            if (response.status === 429 && i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

async function handleAnalysisClick() {
    // Estado de loading
    const originalText = DOM.btnIa.innerHTML;
    DOM.btnIa.innerHTML = '<div class="loader mr-2" style="border-top-color: white; width: 16px; height: 16px; display: inline-block;"></div> Analisando...';
    DOM.btnIa.disabled = true;
    DOM.iaResult.classList.add('hidden');

    try {
        let analysisText = "";

        if (!CONFIG.apiKey) {
            if (CONFIG.mockMode) {
                // Simulação de delay de rede
                await new Promise(resolve => setTimeout(resolve, 1500));

                const cltVal = parseCurrency(DOM.inputClt.value);
                const pjVal = parseCurrency(DOM.inputPj.value);
                analysisText = buildAnalysisPreview(cltVal, pjVal);
            } else {
                throw new Error("Chave de API não configurada.");
            }
        } else {
            // Chamada Real
            const systemPrompt = "Você é um consultor financeiro. Compare CLT vs PJ baseado nos valores, focando em segurança vs liquidez. Resposta curta (max 30 palavras).";
            const userQuery = `CLT: ${DOM.inputClt.value}. PJ: ${DOM.inputPj.value}.`;

            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
            };

            const response = await fetchWithExponentialBackoff(`${CONFIG.apiUrl}?key=${CONFIG.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text || "Erro na geração.";
        }
        
        DOM.iaResult.innerHTML = analysisText;
        DOM.iaResult.classList.remove('hidden');

    } catch (error) {
        console.error(error);
        DOM.iaResult.innerHTML = `<span class="text-red-600">Erro: ${error.message}</span>`;
        DOM.iaResult.classList.remove('hidden');
    } finally {
        DOM.btnIa.innerHTML = originalText;
        DOM.btnIa.disabled = false;
    }
}

function buildAnalysisPreview(cltVal, pjVal) {
    if (!cltVal && !pjVal) {
        return "<strong>Leitura Comparativa:</strong><br>Informe valores de CLT e PJ para gerar uma leitura comparativa.";
    }

    const base = cltVal > 0 ? cltVal : pjVal;
    const diff = pjVal - cltVal;
    const pct = base > 0 ? diff / base : 0;
    const diffLabel = formatMoney(Math.abs(diff));

    const ranges = [
        { max: -0.60, msg: "CLT muito superior. A proposta PJ esta fortemente abaixo do piso de mercado para migracao." },
        { max: -0.50, msg: "CLT claramente mais forte. PJ exigiria renegociacao ampla para cobrir impostos e risco." },
        { max: -0.40, msg: "CLT segue bem acima. Considere PJ apenas com ajuste substancial do valor." },
        { max: -0.35, msg: "CLT ainda vence com folga. Beneficios e estabilidade ampliam essa vantagem." },
        { max: -0.30, msg: "CLT mais vantajosa. PJ nao compensa perda de beneficios diretos." },
        { max: -0.25, msg: "CLT melhor no agregado. Um aumento no PJ seria necessario para empatar." },
        { max: -0.20, msg: "CLT ligeiramente melhor. PJ pode fazer sentido so com ganhos adicionais." },
        { max: -0.15, msg: "CLT esta na frente. Avalie PJ apenas com custo reduzido e reserva formada." },
        { max: -0.10, msg: "CLT superior em pequena margem. Negocie PJ com folga para impostos." },
        { max: -0.07, msg: "CLT levemente melhor. PJ precisa incluir estabilidade minima em contrato." },
        { max: -0.05, msg: "CLT ainda vence. PJ so vale com beneficios equivalentes e aumento." },
        { max: -0.02, msg: "CLT por pouco. O risco do PJ pode nao compensar sem reajuste." },
        { max: 0.02, msg: "Cenarios muito proximos. A decisao deve considerar estabilidade e perfil de risco." },
        { max: 0.05, msg: "PJ levemente superior. Verifique custos fixos e impostos antes de decidir." },
        { max: 0.07, msg: "PJ um pouco melhor. Considere formar reserva e revisar contrato." },
        { max: 0.10, msg: "PJ com vantagem moderada. A troca pode fazer sentido com boa organizacao financeira." },
        { max: 0.15, msg: "PJ em boa vantagem. Estruture pro-labore, impostos e previsao de caixa." },
        { max: 0.20, msg: "PJ ganha com consistencia. Garanta contrato com prazo e reajuste." },
        { max: 0.25, msg: "PJ atrativo. Diferenca tende a cobrir impostos e custos fixos." },
        { max: 0.30, msg: "PJ bem superior. Priorize protecoes contratuais e reserva robusta." },
        { max: 0.35, msg: "PJ muito competitivo. Bom momento para negociar clausulas favoraveis." },
        { max: 0.40, msg: "PJ com folga. A migracao faz sentido se a operacao estiver organizada." },
        { max: 0.50, msg: "PJ altamente vantajoso. Ainda assim, cuide de impostos e previdencia." },
        { max: 0.60, msg: "PJ extremamente superior. Reforce governanca, contabilidade e planejamento." },
        { max: Infinity, msg: "PJ fora do padrao. Revise o contrato e valide custos antes de aceitar." }
    ];

    const selected = ranges.find(range => pct <= range.max) || ranges[ranges.length - 1];
    const directionLabel = diff >= 0 ? "PJ" : "CLT";
    const prefix = "<strong>Leitura Comparativa:</strong>";
    const deltaLine = `Diferença mensal estimada: ${directionLabel} +${diffLabel}.`;
    return `${prefix}<br>${selected.msg}<br><span class="text-xs text-gray-500">${deltaLine}</span>`;
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    initDOM();
    setupInputs();
    calculate(); // Calculo inicial

    if (DOM.proBtn && DOM.proOptions) {
        DOM.proBtn.addEventListener('click', () => {
            DOM.proOptions.classList.toggle('hidden');
        });
    }
    
    // Configura botão android
    const androidBtn = document.querySelector('button disabled') || document.querySelectorAll('button')[1]; // Fallback selector
    if(androidBtn) {
         // Remove disabled para permitir clique com aviso
         androidBtn.removeAttribute('disabled');
         androidBtn.classList.remove('cursor-not-allowed', 'opacity-60', 'grayscale');
         androidBtn.classList.add('hover:bg-gray-200');
         androidBtn.onclick = handleAndroidClick;
    }
});
