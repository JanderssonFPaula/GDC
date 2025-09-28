// ==========================
    // Utilidades e funções puras (facilitam testes)
    // ==========================
    const MS_DIA = 24*60*60*1000;
    const pad2 = (n)=> (n<10? '0'+n : ''+n);
    const toBR = (d)=> `${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`;
    const addDias = (d, n)=> new Date(d.getFullYear(), d.getMonth(), d.getDate()+n);
    const parseBR = (s)=>{ if(!s) return null; const [dd,mm,yy] = s.split('/').map(Number); return new Date(yy, (mm||1)-1, dd||1); };

    const mapSubgrupo = (t)=>{
      const x = Number(t);
      if(Number.isNaN(x)) return '';
      if(x===13.8) return 'A4';
      if(x===34.5) return 'A3-A';
      if(x===69)   return 'A3';
      if(x===138)  return 'A2';
      return 'DADOS INVALIDOS';
    };

    const flagsObras = (prazo)=>{
      const p = Number(prazo)||0;
      return {
        f60:  p>0 && p<=60 ? 'X' : '',
        f120: p>60 && p<=120 ? 'X' : '',
        f365: p>120 && p<=365 ? 'X' : '',
        cron: p>365 ? 'X' : ''
      };
    };

    // ==========================
    // Estado e Persistência
    // ==========================
    let rows = JSON.parse(localStorage.getItem('obras_rows')||'[]');
    let editIdx = null; // índice do registro que está sendo editado
    const save = ()=> localStorage.setItem('obras_rows', JSON.stringify(rows));

    // ==========================
    // Helpers DOM
    // ==========================
    const $ = (sel, root=document)=> root.querySelector(sel);
    const $$ = (sel, root=document)=> root.querySelectorAll(sel);

    // ==========================
    // Tabs
    // ==========================
    $$('.tab').forEach(btn=> btn.addEventListener('click', ()=>{
      $$('.tab').forEach(b=> b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      ['tabela','analitico'].forEach(id=> $('#'+id).classList.add('hidden'));
      if(tab==='tabela') $('#tabela').classList.remove('hidden');
      else { $('#analitico').classList.remove('hidden'); renderAnalitico(); }
    }));

    // ==========================
    // Toolbar
    // ==========================
    $('#btnNovo').addEventListener('click', ()=> openModal());
    $('#btnReset').addEventListener('click', ()=>{ if(confirm('Apagar TODOS os dados salvos no navegador?')){ rows = []; save(); renderGrid(); }});
    $('#btnCols').addEventListener('click', ()=>{
      showAllCols = !showAllCols;
      $('#btnCols').textContent = 'Ver Colunas: ' + (showAllCols? '🙈 Resumido 🙈' : '🙉 Todas 🙉');
      renderGrid();
    });

    // ==========================
    // Modal principal
    // ==========================
    const modal = $('#modal');
    const form = $('#form');

    const openModal = (idx=null)=>{
      editIdx = idx;
      $('#modalTitle').textContent = (idx===null? 'Novo Registro' : `Editar Registro #${rows[idx].id}`);
      form.reset();
      if(idx===null){
        $('#id').value = String(Date.now());
        const hoje = new Date();
        $('#DATA_EMISSAO').value = toBR(hoje);
        $('#DESEJA_RESEBER_EMAIL').value = 'NÃO';
        $('#EMAIL').value = 'N/A';
        //$('#STATUS_SISTEMA').value = '';
      } else {
        const r = rows[idx];
        for(const k in r){ const el = form.querySelector(`[name="${k}"]`); if(el){ el.value = r[k]; }}
      }
      applyRules();

      // --- CORREÇÃO: Seleciona os modelos salvos ao editar ---
      if(idx!==null){
        const r = rows[idx];
        if(r.MODELO_CUSD)  $('#MODELO_CUSD').value  = r.MODELO_CUSD;
        if(r.MODELO_CCER)  $('#MODELO_CCER').value  = r.MODELO_CCER;
        if(r.MODELO_OBRAS) $('#MODELO_OBRAS').value = r.MODELO_OBRAS;
      }
      // -------------------------------------------------------

      modal.classList.remove('hidden');
    };
    const closeModal = ()=> modal.classList.add('hidden');
    $('#btnClose').addEventListener('click', closeModal);

    // ==========================
    // Regras e campos dependentes
    // ==========================
    function applyRules(){
      const deseja = $('#DESEJA_RESEBER_EMAIL').value;
      const email = $('#EMAIL');
      if(deseja==='SIM'){ email.readOnly=false; if(email.value==='N/A') email.value=''; }
      else { email.value='N/A'; email.readOnly=true; }

      const tensao = parseFloat($('#TENSAO').value);
      $('#SUBGRUPO_TARIFARIO').value = mapSubgrupo(tensao);

      const emissao = parseBR($('#DATA_EMISSAO').value);
      const prazo = parseInt($('#PRAZO_OBRAS').value||'0',10);
      if(emissao){
        const inicio = addDias(emissao, 10);
        $('#INICIO_OBRAS').value = toBR(inicio);
        const fim = addDias(inicio, isNaN(prazo)?0:prazo);
        $('#FIM_OBRAS').value = toBR(fim);

        const flags = flagsObras(prazo);
        $('#OBRAS_60').value  = flags.f60;
        $('#OBRAS_120').value = flags.f120;
        $('#OBRAS_365').value = flags.f365;
        $('#OBRA_CRONOGRAMA').value = flags.cron;
      }

      const forma = $('#FORMA_OBRAS').value;
      const numContrato = $('#NUM_CONTRATO').value || '';
      const inicioStr = $('#INICIO_OBRAS').value;
      const fill = (id,value)=>{ const el = $('#'+id); el.value = value; };
      if(forma==='A'){
        fill('CONTRATO_A', numContrato||'N/A');
        fill('CELEBRACAO_A', inicioStr||'N/A');
        fill('CONTRATO_B','N/A'); fill('CELEBRACAO_B','N/A');
        fill('CONTRATO_C','N/A'); fill('CELEBRACAO_C','N/A');
      } else if(forma==='B'){
        fill('CONTRATO_B', numContrato||'N/A');
        fill('CELEBRACAO_B', inicioStr||'N/A');
        fill('CONTRATO_A','N/A'); fill('CELEBRACAO_A','N/A');
        fill('CONTRATO_C','N/A'); fill('CELEBRACAO_C','N/A');
      } else if(forma==='C'){
        fill('CONTRATO_C', numContrato||'N/A');
        fill('CELEBRACAO_C', inicioStr||'N/A');
        fill('CONTRATO_A','N/A'); fill('CELEBRACAO_A','N/A');
        fill('CONTRATO_B','N/A'); fill('CELEBRACAO_B','N/A');
      } else {
        fill('CONTRATO_A','N/A'); fill('CELEBRACAO_A','N/A');
        fill('CONTRATO_B','N/A'); fill('CELEBRACAO_B','N/A');
        fill('CONTRATO_C','N/A'); fill('CELEBRACAO_C','N/A');
      }

      const cart = $('#CARTEIRA').value || '';
      const temAditivo = ($('#NUM_ADITIVO').value || '').trim() !== '';

      function setOptions(sel, arr) {
        sel.innerHTML = '';
        arr.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v;
          opt.textContent = v;
          sel.appendChild(opt);
        });
      }

      // Gera listas (primeiro item é vazio)
      const optsCUSD = [
        '',  // opção vazia
        `MODELO_CUSD_${cart}`,
        `MODELO_CUSD_ADITIVO_${cart}`
      ];
      const optsCCER = [
        '',
        `MODELO_CCER_${cart}`,
        `MODELO_CCER_ADITIVO_${cart}`
      ];
      const optsOBRAS = [
        '',
        `MODELO_OBRAS_${cart}`
      ];

      // Preenche os selects com a opção vazia no topo
      setOptions($('#MODELO_CUSD'), optsCUSD);
      setOptions($('#MODELO_CCER'), optsCCER);
      setOptions($('#MODELO_OBRAS'), optsOBRAS);

    }

    form.addEventListener('input', (e)=>{
      const ids = ['DESEJA_RESEBER_EMAIL','TENSAO','PRAZO_OBRAS','FORMA_OBRAS','NUM_CONTRATO','CARTEIRA','NUM_ADITIVO'];
      if(ids.includes(e.target.id)) applyRules();
    });

    $('#btnSalvar').addEventListener('click', ()=>{
      const data = Object.fromEntries(new FormData(form).entries());
      data.id = Number(data.id || Date.now());
      if(!data.Data_de_EMISSAO) data.Data_de_EMISSAO = $('#DATA_EMISSAO').value || toBR(new Date());

      // Adicione estas linhas para garantir que os selects dinâmicos sejam salvos:
      data.MODELO_CUSD = $('#MODELO_CUSD').value;
      data.MODELO_CCER = $('#MODELO_CCER').value;
      data.MODELO_OBRAS = $('#MODELO_OBRAS').value;

      if(editIdx===null){
        data.STATUS_CUSD = 'NÃO SE APLICA';
        data.STATUS_CCER = 'NÃO SE APLICA';
        data.STATUS_OBRAS = 'NÃO SE APLICA';
        rows.push(data);
      } else {
        rows[editIdx] = { ...rows[editIdx], ...data };
      }
      save(); renderGrid(); closeModal();
    });

    // ==========================
    // Grid
    // ==========================
    const thead = $('#gridHead');
    const tbody = $('#grid tbody');

    let showAllCols = true; // exibir todas as colunas por padrão
    const COMPACT_COLS = [
      'id',
      'NUM_UC',
      'NOME_CLIENTE',
      'STATUS_SISTEMA',
      'STATUS_CUSD',
      'STATUS_CCER',
      'STATUS_OBRAS'
    ];

    function uniqueKeys(){
      const s = new Set();
      rows.forEach(r=> Object.keys(r).forEach(k=> s.add(k)) );
      const preferred = ['id','NUM_UC','NOME_CLIENTE','STATUS_SISTEMA','Data_de_EMISSAO','INICIO_DAS_OBRAS','FIM_DAS_OBRAS'];
      const rest = Array.from(s).filter(k=> !preferred.includes(k));
      return [...preferred, ...rest];
    }

    function buildHead(cols){
      const tr = document.createElement('tr');
      cols.forEach(c=>{ const th = document.createElement('th'); th.textContent = c; tr.appendChild(th); });
      const thA = document.createElement('th'); thA.textContent = 'Ações'; tr.appendChild(thA);
      thead.innerHTML = ''; thead.appendChild(tr);
    }

    const pill = (txt, cls)=> `<span class="pill ${cls||''}">${txt||''}</span>`;

    function renderGrid(){
      let cols = showAllCols ? uniqueKeys() : COMPACT_COLS; if(cols.length===0) cols = COMPACT_COLS;
      buildHead(cols);
      tbody.innerHTML = '';
      rows.forEach((r, i)=>{
        const emissao = parseBR(r.Data_de_EMISSAO || r.DATA_EMISSAO);
        const dias = emissao? Math.floor((Date.now()-emissao.getTime())/MS_DIA) : '';
        const isCancel = r.STATUS_SISTEMA==='CANCELADO';
        const isEmpty = !r.STATUS_SISTEMA;
        let pClass = 'ok';
        if(isCancel){ pClass=''; }
        else if(isEmpty && dias>30){ pClass='bad'; }
        else if(r.STATUS_SISTEMA==='CONCLUIDO'){
          const dc = r.DATA_CONCLUSAO? new Date(r.DATA_CONCLUSAO) : null;
          const limite = emissao? addDias(emissao,30) : null;
          if(dc && limite && dc>limite){ pClass='bad'; }
          else pClass='ok';
        } else if(isEmpty){ pClass='warn'; }

        const tr = document.createElement('tr');
        cols.forEach(c=>{
          let val = r[c] ?? '';
          if(c==='STATUS_SISTEMA') val = pill(r.STATUS_SISTEMA||'EM ANDAMENTO', isCancel? '' : (pClass||''));
          const td = document.createElement('td'); td.innerHTML = String(val); tr.appendChild(td);
        });
        const tdAc = document.createElement('td');
        tdAc.innerHTML = `<button class="btn" data-act="edit" data-i="${i}">Editar</button>
            <button class="btn" data-act="status" data-i="${i}">Status</button>
            <button class="btn btn-danger" data-act="del" data-i="${i}">Excluir</button>`;
        tr.appendChild(tdAc);
        tbody.appendChild(tr);
      });
    }

    tbody.addEventListener('click', (e)=>{
      const btn = e.target.closest('button'); if(!btn) return;
      const i = Number(btn.dataset.i);
      const act = btn.dataset.act;
      if(act==='edit')      openModal(i);
      else if(act==='del'){ if(confirm('Excluir este registro?')){ rows.splice(i,1); save(); renderGrid(); }}
      else if(act==='status') openModalStatus(i);
    });

    // ==========================
    // Import / Export Excel
    // ==========================
    $('#btnImport').addEventListener('click', ()=>{
      const inp = document.createElement('input');
      inp.type='file'; inp.accept='.xlsx,.xls';
      inp.onchange = (ev)=>{
        const file = ev.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (e)=>{
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, {type:'array'});
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          // Use defval: "" para garantir que todos os campos sejam lidos
          let imported = XLSX.utils.sheet_to_json(sheet, {defval: ""});

          // Garante que todos os campos MODELO_* existam mesmo se vierem vazios
          imported = imported.map(row => ({
            ...row,
            MODELO_CUSD: row.MODELO_CUSD || '',
            MODELO_CCER: row.MODELO_CCER || '',
            MODELO_OBRAS: row.MODELO_OBRAS || ''
          }));

          rows = imported;
          save(); renderGrid();
          alert('Importação concluída!');
        };
        reader.readAsArrayBuffer(file);
      };
      inp.click();
    });

    $('#btnExport').addEventListener('click', ()=>{
      // Cria uma cópia dos dados, substituindo campos vazios por 'N/A'
      const rowsExport = rows.map(row => {
        const novo = {};
        for (const k in row) {
          // Considera vazio: string vazia, null ou undefined
          novo[k] = (row[k] === '' || row[k] === null || row[k] === undefined) ? 'N/A' : row[k];
        }
        return novo;
      });
      const ws = XLSX.utils.json_to_sheet(rowsExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dados');
      XLSX.writeFile(wb, 'dados_obras.xlsx');
    });

    // ==========================
    // Modal de Status (CUSD/CCER/OBRAS)
    // ==========================
    const modalStatus = $('#modalStatus');
    let statusIdx = null;
    function openModalStatus(idx){
      statusIdx = idx;
      const r = rows[idx];
      $('#STATUS_SISTEMA').value = r.STATUS_SISTEMA || '';
      $('#DATA_CONCLUSAO').value = r.DATA_CONCLUSAO || '';
      $('#STATUS_CUSD').value = r.STATUS_CUSD || 'NÃO SE APLICA';
      $('#STATUS_CCER').value = r.STATUS_CCER || 'NÃO SE APLICA';
      $('#STATUS_OBRAS').value = r.STATUS_OBRAS || 'NÃO SE APLICA';
      modalStatus.classList.remove('hidden');
    }

    const closeModalStatus = ()=> modalStatus.classList.add('hidden');
    $('#btnCloseStatus').addEventListener('click', closeModalStatus);
    $('#btnSalvarStatus').addEventListener('click', ()=>{
      if(statusIdx===null) return;
      rows[statusIdx].STATUS_SISTEMA = $('#STATUS_SISTEMA').value;
      rows[statusIdx].DATA_CONCLUSAO = $('#DATA_CONCLUSAO').value;
      rows[statusIdx].STATUS_CUSD = $('#STATUS_CUSD').value;
      rows[statusIdx].STATUS_CCER = $('#STATUS_CCER').value;
      rows[statusIdx].STATUS_OBRAS = $('#STATUS_OBRAS').value;
      save(); renderGrid(); closeModalStatus();
    });

    // ==========================
    // Analítico
    // ==========================
    function cardStat(titulo, valor){
      const box = document.createElement('div');
      box.className='col-3';
      box.innerHTML = `<div class="card" style="text-align:center; padding:16px 12px">
        <div style="font-size:12px; color:var(--muted)">${titulo}</div>
        <div style="font-size:28px; font-weight:800; margin-top:4px">${valor}</div>
      </div>`;
      return box;
    }

    function renderAnalitico(){
      const box = $('#boxResumo'); box.innerHTML='';
      let tot = rows.length;
      let cancel = 0, concl = 0, andamento = 0, vencidos = 0, conclNoPrazo = 0, conclForaPrazo = 0;
      const lst = $('#listaVencidos'); lst.innerHTML='';
      rows.forEach(r=>{
        const emissao = parseBR(r.Data_de_EMISSAO || r.DATA_EMISSAO);
        const dias = emissao? Math.floor((Date.now()-emissao.getTime())/MS_DIA) : 0;
        if(r.STATUS_SISTEMA==='CANCELADO') cancel++;
        else if(r.STATUS_SISTEMA==='CONCLUIDO'){
          concl++;
          const dc = r.DATA_CONCLUSAO? new Date(r.DATA_CONCLUSAO) : null;
          const limite = emissao? addDias(emissao, 30) : null;
          if(dc && limite && dc>limite) conclForaPrazo++; else conclNoPrazo++;
        } else {
          andamento++;
          if(dias>30){
            vencidos++;
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${r.id||''}</td><td>${r.NUM_UC||''}</td><td>${r.NOME_CLIENTE||''}</td><td>${r.Data_de_EMISSAO||r.DATA_EMISSAO||''}</td><td>${dias}</td><td>${r.STATUS_SISTEMA||'EM ANDAMENTO'}</td>`;
            lst.appendChild(tr);
          }
        }
      });
      box.appendChild(cardStat('Total', tot));
      box.appendChild(cardStat('Cancelados', cancel));
      box.appendChild(cardStat('Concluídos', concl));
      box.appendChild(cardStat('Em andamento', andamento));
      box.appendChild(cardStat('Vencidos (+30d)', vencidos));
      box.appendChild(cardStat('Concluídos no prazo', conclNoPrazo));
      box.appendChild(cardStat('Concluídos fora do prazo', conclForaPrazo));
    }

    // ==========================
    // Eventos globais
    // ==========================
    $('#DESEJA_RESEBER_EMAIL').addEventListener('change', applyRules);
    [$('#modal'), $('#modalStatus')].forEach(m=> m.addEventListener('click', (e)=>{ if(e.target===m) m.classList.add('hidden'); }));
    $('#tabTabela').addEventListener('click', ()=>{ document.querySelector('[data-tab="tabela"]').click(); });
    $('#tabAnalitico').addEventListener('click', ()=>{ document.querySelector('[data-tab="analitico"]').click(); });

    // ==========================
    // Testes automáticos (dev)
    // ==========================
    function addTestResult(ok, msg){
      const li = document.createElement('li');
      li.textContent = (ok? '✔ ' : '✖ ') + msg;
      li.className = ok? 'pass' : 'fail';
      document.getElementById('testList').appendChild(li);
      if(!ok) console.error(msg);
    }

    function runTests(){
      // mapSubgrupo
      addTestResult(mapSubgrupo(13.8)==='A4', '13.8 -> A4');
      addTestResult(mapSubgrupo(34.5)==='A3-A', '34.5 -> A3-A');
      addTestResult(mapSubgrupo(69)==='A3', '69 -> A3');
      addTestResult(mapSubgrupo(138)==='A2', '138 -> A2');
      addTestResult(mapSubgrupo(12)==='DADOS INVALIDOS', '12 -> DADOS INVALIDOS');

      // flagsObras
      const f30=flagsObras(30), f90=flagsObras(90), f200=flagsObras(200), f500=flagsObras(500);
      addTestResult(f30.f60==='X' && !f30.f120 && !f30.f365 && !f30.cron, 'Prazo 30 -> 60');
      addTestResult(f90.f120==='X', 'Prazo 90 -> 120');
      addTestResult(f200.f365==='X', 'Prazo 200 -> 365');
      addTestResult(f500.cron==='X', 'Prazo 500 -> Cronograma');

      // datas
      const em=parseBR('01/01/2025'); const ini=addDias(em,10); const fim=addDias(ini,20);
      addTestResult(toBR(ini)==='11/01/2025', 'Início = Emissão + 10');
      addTestResult(toBR(fim)==='31/01/2025', 'Fim = Início + 20');
    }

    // Inicialização
    (function(){
      renderGrid();
      runTests();
    })();


    // ajuste do tema dark/light
    const btnTheme = document.querySelector('#toggleTheme');

    // aplica a preferência salva
    if(localStorage.getItem('theme') === 'light'){
      document.body.classList.add('light');
    }

    btnTheme.addEventListener('click', () => {
      document.body.classList.toggle('light');
      const tema = document.body.classList.contains('light') ? 'light' : 'dark';
      localStorage.setItem('theme', tema);
    });
//
    function formatCpfCnpj(value) {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
    } else {
      return numbers
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
  }

  // Seleciona todos os inputs com a classe cpf-cnpj
  document.querySelectorAll('.cpf-cnpj').forEach(input => {
    input.addEventListener('input', e => {
      e.target.value = formatCpfCnpj(e.target.value);
    });
  });

// Função para pegar a data de hoje no formato yyyy-mm-dd
function hojeISO() {
  const hoje = new Date();
  return hoje.toISOString().slice(0, 10);
}

// Evento para o select de status do sistema no modal de status
$('#STATUS_SISTEMA').addEventListener('change', function() {
  if (this.value === 'CONCLUIDO') {
    $('#DATA_CONCLUSAO').value = hojeISO();
  }
});


document.addEventListener('DOMContentLoaded', function() {
  const tipoContrato = document.getElementById('TIPO_DE_CONTRATO');
  const detalhamento = document.getElementById('DETALHAMENTO');

  function atualizarDetalhamento() {
    if (tipoContrato.value === 'SEM OBRAS') {
      detalhamento.value = 'N/A';
      detalhamento.readOnly = true;
      detalhamento.style.background = '#eee';
    } else {
      if (detalhamento.value === 'N/A') detalhamento.value = '';
      detalhamento.readOnly = false;
      detalhamento.style.background = '';
    }
  }

  tipoContrato.addEventListener('change', atualizarDetalhamento);
  atualizarDetalhamento();
});

// Certifique-se que o DOM está carregado antes de adicionar o evento
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('btnSalvar').addEventListener('click', function() {
    // Aqui vai a lógica para salvar os dados do formulário
    // Exemplo:
    // const form = document.getElementById('form');
    // const data = new FormData(form);
    // ...salvar os dados...
  });
});