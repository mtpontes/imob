/* ==========================================================================
   STATE & DATA STORE (Simulação do DynamoDB via LocalStorage)
   ========================================================================== */

class DataStore {
  constructor() {
    this.currentWorkspace = null;
    this.currentUser = null;
  }

  // Define o usuário atual e inicializa dados padrão se necessário
  setUser(email) {
    this.currentUser = email;
    // Resolve o workspaceId com base no e-mail (ex: joao@email.com -> joao-email-com)
    this.currentWorkspace = email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    
    sessionStorage.setItem('imobapp_current_user', email);
    sessionStorage.setItem('imobapp_current_workspace', this.currentWorkspace);

    // Inicializa o banco de dados local com mocks se for a primeira vez
    this.initializeDefaultData();
  }

  clearUser() {
    this.currentUser = null;
    this.currentWorkspace = null;
    sessionStorage.removeItem('imobapp_current_user');
    sessionStorage.removeItem('imobapp_current_workspace');
  }

  restoreSession() {
    const user = sessionStorage.getItem('imobapp_current_user');
    const workspace = sessionStorage.getItem('imobapp_current_workspace');
    if (user && workspace) {
      this.currentUser = user;
      this.currentWorkspace = workspace;
      return true;
    }
    return false;
  }

  // Inicializa dados padrão específicos do Workspace caso ele esteja vazio
  initializeDefaultData() {
    const propertiesKey = `imobapp_properties_${this.currentWorkspace}`;
    const templatesKey = `imobapp_templates_${this.currentWorkspace}`;
    const evalsKey = `imobapp_evaluations_${this.currentWorkspace}`;

    // 1. Imóveis Mocks
    if (!localStorage.getItem(propertiesKey)) {
      const defaultProperties = [
        {
          id: 'prop-1',
          address: 'Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo - SP',
          price: 1850000,
          sqm: 110,
          bedrooms: 3,
          bathrooms: 3,
          parking: 2,
          url: 'https://www.quintoandar.com.br',
          createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString() // 3 dias atrás
        },
        {
          id: 'prop-2',
          address: 'Rua Oscar Freire, 1420 - Cerqueira César, São Paulo - SP',
          price: 3200000,
          sqm: 180,
          bedrooms: 4,
          bathrooms: 5,
          parking: 3,
          url: 'https://www.quintoandar.com.br',
          createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString() // 7 dias atrás
        },
        {
          id: 'prop-3',
          address: 'Rua Bela Cintra, 890 - Consolação, São Paulo - SP',
          price: 750000,
          sqm: 65,
          bedrooms: 1,
          bathrooms: 1,
          parking: 1,
          url: '',
          createdAt: new Date(Date.now() - 3600000 * 12).toISOString() // 12 horas atrás
        }
      ];
      localStorage.setItem(propertiesKey, JSON.stringify(defaultProperties));
    }

    // 2. Templates Mocks
    if (!localStorage.getItem(templatesKey)) {
      const defaultTemplates = [
        {
          id: 'tpl-padrao',
          version: 1,
          name: 'Vistoria Padrão Residencial',
          isActive: true,
          createdAt: new Date().toISOString(),
          criteria: [
            { id: 'crit-1', label: 'Pintura interna sem manchas ou descascamento', type: 'bool', isScorable: true, weight: 2 },
            { id: 'crit-2', label: 'Conservação dos pisos e azulejos', type: 'range', isScorable: true, weight: 3 },
            { id: 'crit-3', label: 'Sinais de umidade ou vazamentos nas paredes', type: 'bool', isScorable: true, weight: 4 },
            { id: 'crit-4', label: 'Estado de conservação da fiação elétrica', type: 'range', isScorable: true, weight: 3 },
            { id: 'crit-5', label: 'Observações gerais do quintal / varanda', type: 'text', isScorable: false, weight: 1 }
          ]
        },
        {
          id: 'tpl-luxo',
          version: 1,
          name: 'Vistoria Residencial de Alto Padrão',
          isActive: true,
          createdAt: new Date().toISOString(),
          criteria: [
            { id: 'crit-l1', label: 'Qualidade do acabamento e marcas dos revestimentos', type: 'range', isScorable: true, weight: 5 },
            { id: 'crit-l2', label: 'Funcionamento de automação e iluminação cênica', type: 'bool', isScorable: true, weight: 3 },
            { id: 'crit-l3', label: 'Conservação da área de lazer (piscina, sauna, gourmet)', type: 'range', isScorable: true, weight: 4 },
            { id: 'crit-l4', label: 'Presença de ar condicionado central integrado', type: 'bool', isScorable: true, weight: 2 },
            { id: 'crit-l5', label: 'Detalhes sobre a segurança perimetral e guarita', type: 'text', isScorable: false, weight: 1 }
          ]
        }
      ];
      localStorage.setItem(templatesKey, JSON.stringify(defaultTemplates));
    }

    // 3. Avaliações Mocks
    if (!localStorage.getItem(evalsKey)) {
      const defaultEvaluations = [
        {
          propertyId: 'prop-1',
          templateId: 'tpl-padrao',
          templateVersion: 1,
          finalScore: 7.2,
          notes: 'Imóvel em bom estado de conservação. Pequena mancha de umidade na parede do banheiro da suíte principal. Pintura da sala de estar está recente.',
          mediaKeys: [
            'placeholder_sala.jpg',
            'placeholder_banheiro.jpg'
          ],
          answers: {
            'crit-1': true, // Pintura ok
            'crit-2': 7,    // Pisos nota 7
            'crit-3': false, // Umidade identificada (como a pergunta é 'Sinais de umidade', responder false é positivo? Depende de como formula. Aqui simula respostas diretas)
            'crit-4': 8,    // Elétrica nota 8
            'crit-5': 'Quintal espaçoso com churrasqueira pequena.'
          },
          createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString() // 2 dias atrás
        }
      ];
      localStorage.setItem(evalsKey, JSON.stringify(defaultEvaluations));
    }
  }

  // --- MÉTODOS DE IMÓVEIS (PROPERTIES) ---
  
  getProperties() {
    const key = `imobapp_properties_${this.currentWorkspace}`;
    return JSON.parse(localStorage.getItem(key)) || [];
  }

  saveProperty(property) {
    const key = `imobapp_properties_${this.currentWorkspace}`;
    const properties = this.getProperties();
    property.id = 'prop-' + Math.random().toString(36).substr(2, 9);
    property.createdAt = new Date().toISOString();
    properties.push(property);
    localStorage.setItem(key, JSON.stringify(properties));
    return property;
  }

  getProperty(id) {
    return this.getProperties().find(p => p.id === id);
  }

  // --- MÉTODOS DE TEMPLATES ---

  getTemplates() {
    const key = `imobapp_templates_${this.currentWorkspace}`;
    return JSON.parse(localStorage.getItem(key)) || [];
  }

  getActiveTemplates() {
    return this.getTemplates().filter(t => t.isActive);
  }

  saveTemplate(templateData, saveMode) {
    const key = `imobapp_templates_${this.currentWorkspace}`;
    const templates = this.getTemplates();

    if (saveMode === 'new-version') {
      // Inativa versões antigas do mesmo template ID
      templates.forEach(t => {
        if (t.id === templateData.id) {
          t.isActive = false;
        }
      });
      // Cria novo item com versão incremental
      const newTpl = {
        id: templateData.id,
        version: templateData.version + 1,
        name: templateData.name,
        isActive: true,
        criteria: templateData.criteria,
        createdAt: new Date().toISOString()
      };
      templates.push(newTpl);
      localStorage.setItem(key, JSON.stringify(templates));
      return newTpl;
    } else if (saveMode === 'overwrite' && templateData.id) {
      // Sobrescrita Total (Substituição total conforme PutItem do DynamoDB)
      const index = templates.findIndex(t => t.id === templateData.id && t.version === templateData.version);
      if (index !== -1) {
        templates[index] = {
          id: templateData.id,
          version: templateData.version,
          name: templateData.name,
          isActive: true,
          criteria: templateData.criteria,
          createdAt: new Date().toISOString() // atualiza data
        };
        localStorage.setItem(key, JSON.stringify(templates));
        return templates[index];
      }
    } else {
      // Novo Template v1
      const newTpl = {
        id: 'tpl-' + Math.random().toString(36).substr(2, 9),
        version: 1,
        name: templateData.name,
        isActive: true,
        criteria: templateData.criteria,
        createdAt: new Date().toISOString()
      };
      templates.push(newTpl);
      localStorage.setItem(key, JSON.stringify(templates));
      return newTpl;
    }
  }

  getTemplate(id, version) {
    return this.getTemplates().find(t => t.id === id && t.version === parseInt(version));
  }

  toggleTemplateActive(id, version) {
    const key = `imobapp_templates_${this.currentWorkspace}`;
    const templates = this.getTemplates();
    const tpl = templates.find(t => t.id === id && t.version === parseInt(version));
    if (tpl) {
      tpl.isActive = !tpl.isActive;
      localStorage.setItem(key, JSON.stringify(templates));
    }
  }

  // --- MÉTODOS DE AVALIAÇÕES (EVALUATIONS) ---

  getEvaluations() {
    const key = `imobapp_evaluations_${this.currentWorkspace}`;
    return JSON.parse(localStorage.getItem(key)) || [];
  }

  getPropertyEvaluations(propertyId) {
    return this.getEvaluations()
      .filter(e => e.propertyId === propertyId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  saveEvaluation(evaluation) {
    const key = `imobapp_evaluations_${this.currentWorkspace}`;
    const evaluations = this.getEvaluations();
    evaluation.createdAt = new Date().toISOString();
    evaluations.push(evaluation);
    localStorage.setItem(key, JSON.stringify(evaluations));
    return evaluation;
  }
}

const db = new DataStore();

/* ==========================================================================
   ROUTER & NAVIGATION ENGINE
   ========================================================================== */

class Router {
  constructor() {
    this.routes = {
      'login': { title: 'Acessar Conta', onEnter: () => this.setupLoginView() },
      'properties': { title: 'Imóveis', onEnter: () => this.renderPropertiesView() },
      'property-create': { title: 'Cadastrar Imóvel', onEnter: () => this.setupPropertyCreateView() },
      'templates': { title: 'Templates', onEnter: () => this.renderTemplatesView() },
      'template-create': { title: 'Criar Template', onEnter: () => this.setupTemplateBuilderView() },
      'template-edit': { title: 'Editar Template', onEnter: (params) => this.setupTemplateBuilderView(params) },
      'evaluation-create': { title: 'Nova Avaliação', onEnter: (params) => this.setupEvaluationCreateView(params) },
      'property-details': { title: 'Histórico do Imóvel', onEnter: (params) => this.renderPropertyDetailsView(params) }
    };
    
    this.currentView = null;
    this.navigationHistory = [];
  }

  navigate(viewName, params = {}) {
    const route = this.routes[viewName];
    if (!route) return;

    // Se não estiver logado e tentar acessar outra rota, força login
    if (!db.currentUser && viewName !== 'login') {
      this.navigate('login');
      return;
    }

    // Gerencia Classes Ativas no Layout
    const appEl = document.getElementById('app');
    if (viewName === 'login') {
      appEl.classList.add('logged-out');
    } else {
      appEl.classList.remove('logged-out');
    }

    // Transição de tela suave
    const activeViewEl = document.querySelector('.view.active');
    if (activeViewEl) {
      activeViewEl.classList.remove('active');
    }

    const nextViewEl = document.getElementById(`view-${viewName === 'template-edit' ? 'template-builder' : viewName}`);
    if (nextViewEl) {
      setTimeout(() => {
        nextViewEl.classList.add('active');
      }, 50);
    }

    // Atualiza barra de navegação ativa
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (viewName === 'properties' || viewName === 'property-details' || viewName === 'property-create' || viewName === 'evaluation-create') {
      document.getElementById('nav-item-properties')?.classList.add('active');
    } else if (viewName === 'templates' || viewName === 'template-create' || viewName === 'template-edit') {
      document.getElementById('nav-item-templates')?.classList.add('active');
    }

    // Configura dados da View
    route.onEnter(params);
    this.currentView = viewName;
    
    // Atualiza ícones do Lucide carregados dinamicamente
    setTimeout(() => {
      lucide.createIcons();
    }, 100);

    // Salva histórico virtual
    this.navigationHistory.push({ viewName, params });
  }

  goBack() {
    if (this.navigationHistory.length > 1) {
      this.navigationHistory.pop(); // remove a atual
      const prev = this.navigationHistory.pop(); // pega a anterior
      this.navigate(prev.viewName, prev.params);
    } else {
      this.navigate('properties');
    }
  }

  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast-message ${type}`;
    toast.innerHTML = `
      <i data-lucide="${type === 'success' ? 'check-circle' : type === 'warning' ? 'alert-triangle' : 'alert-circle'}"></i>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    lucide.createIcons();
    
    // Anima Entrada
    setTimeout(() => toast.classList.add('visible'), 50);
    // Remove
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  closeModal() {
    const modal = document.getElementById('evaluation-details-modal');
    modal.classList.add('hide');
  }
}

const appRouter = new Router();

/* ==========================================================================
   VIEW CONTROLLERS (Lógica específica de cada tela)
   ========================================================================== */

// --- 1. LOGIN VIEW ---
Router.prototype.setupLoginView = function() {
  const form = document.getElementById('login-form');
  const bypassBtn = document.getElementById('btn-bypass-login');

  form.onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    if (email) {
      db.setUser(email);
      this.loginSuccess(email);
    }
  };

  if (bypassBtn) {
    bypassBtn.onclick = () => {
      const email = 'demo@imobapp.com.br';
      db.setUser(email);
      this.loginSuccess(email);
    };
  }
};

Router.prototype.loginSuccess = function(email) {
  // Ajusta UI do Header
  document.getElementById('workspace-name-display').innerText = `Workspace: ${db.currentWorkspace.toUpperCase()}`;
  document.getElementById('user-email-display').innerText = email;
  document.getElementById('user-avatar-initials').innerText = email.substring(0, 2).toUpperCase();

  this.showToast('Login efetuado com sucesso!');
  this.navigate('properties');
};

// --- 2. PROPERTIES VIEW (DASHBOARD) ---
Router.prototype.renderPropertiesView = function() {
  const grid = document.getElementById('properties-grid');
  const emptyState = document.getElementById('properties-empty-state');
  const searchInput = document.getElementById('property-search');
  const sortSelect = document.getElementById('property-sort');

  const render = () => {
    let properties = db.getProperties();
    const query = searchInput.value.toLowerCase().trim();

    // Filtro de Busca
    if (query) {
      properties = properties.filter(p => p.address.toLowerCase().includes(query));
    }

    // Ordenação
    const sortVal = sortSelect.value;
    if (sortVal === 'recent') {
      properties.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortVal === 'price-asc') {
      properties.sort((a, b) => a.price - b.price);
    } else if (sortVal === 'price-desc') {
      properties.sort((a, b) => b.price - a.price);
    } else if (sortVal === 'sqm-desc') {
      properties.sort((a, b) => b.sqm - a.sqm);
    }

    // Limpa Grid
    grid.innerHTML = '';

    if (properties.length === 0) {
      grid.classList.add('hide');
      emptyState.classList.remove('hide');
      return;
    }

    grid.classList.remove('hide');
    emptyState.classList.add('hide');

    properties.forEach(p => {
      const evals = db.getPropertyEvaluations(p.id);
      const lastEval = evals[0]; // mais recente
      
      let scoreBadgeHtml = '<div class="property-score-badge none"><span class="score-num">-</span><span class="score-lbl">Sem nota</span></div>';
      if (lastEval) {
        const score = lastEval.finalScore;
        const scoreClass = score >= 7 ? 'high' : score >= 5 ? 'medium' : 'low';
        scoreBadgeHtml = `
          <div class="property-score-badge ${scoreClass}">
            <span>${score.toFixed(1)}</span>
            <span class="score-lbl">Score</span>
          </div>
        `;
      }

      const card = document.createElement('div');
      card.className = 'property-card glass';
      card.onclick = () => this.navigate('property-details', { id: p.id });
      card.innerHTML = `
        <div class="property-card-header">
          <h3>${p.address}</h3>
          ${scoreBadgeHtml}
        </div>
        <div class="property-specs">
          <div class="spec-pill">
            <i data-lucide="maximize-2"></i>
            <span>${p.sqm} m²</span>
          </div>
          <div class="spec-pill">
            <i data-lucide="bed"></i>
            <span>${p.bedrooms} Qtd</span>
          </div>
          <div class="spec-pill">
            <i data-lucide="car"></i>
            <span>${p.parking} Vagas</span>
          </div>
        </div>
        <div class="property-card-footer">
          <div class="prop-price-lbl">R$ ${p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div class="prop-evals-count">
            <i data-lucide="clipboard"></i>
            <span>${evals.length} ${evals.length === 1 ? 'visita' : 'visitas'}</span>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
    lucide.createIcons();
  };

  // Event Listeners
  searchInput.oninput = render;
  sortSelect.onchange = render;

  render();
};

// --- 3. PROPERTY CREATE VIEW ---
Router.prototype.setupPropertyCreateView = function() {
  const form = document.getElementById('property-form');
  form.reset();

  form.onsubmit = (e) => {
    e.preventDefault();
    const propertyData = {
      address: document.getElementById('prop-address').value,
      price: parseFloat(document.getElementById('prop-price').value),
      sqm: parseInt(document.getElementById('prop-sqm').value),
      bedrooms: parseInt(document.getElementById('prop-bedrooms').value),
      bathrooms: parseInt(document.getElementById('prop-bathrooms').value),
      parking: parseInt(document.getElementById('prop-parking').value),
      url: document.getElementById('prop-url').value
    };

    const saved = db.saveProperty(propertyData);
    this.showToast('Imóvel cadastrado com sucesso!');
    this.navigate('property-details', { id: saved.id });
  };
};

// --- 4. TEMPLATES VIEW ---
Router.prototype.renderTemplatesView = function() {
  const container = document.getElementById('templates-list-container');
  const emptyState = document.getElementById('templates-empty-state');
  
  const render = () => {
    const templates = db.getTemplates();
    container.innerHTML = '';

    if (templates.length === 0) {
      container.classList.add('hide');
      emptyState.classList.remove('hide');
      return;
    }

    container.classList.remove('hide');
    emptyState.classList.add('hide');

    // Agrupa por template ID para mostrar histórico de versões ou destaca a ativa
    templates.forEach(t => {
      const row = document.createElement('div');
      row.className = `template-row glass ${t.isActive ? '' : 'inactive-template'}`;
      
      const scorableCount = t.criteria.filter(c => c.isScorable).length;
      
      row.innerHTML = `
        <div class="template-row-info">
          <h3>
            ${t.name} 
            <span class="ver-badge">v${t.version}</span>
            ${t.isActive ? '<span class="status-badge-active">Ativo</span>' : '<span class="status-badge-inactive">Inativo</span>'}
          </h3>
          <div class="template-row-meta">
            <span>Criado em: ${new Date(t.createdAt).toLocaleDateString('pt-BR')}</span>
            <span>•</span>
            <span>${t.criteria.length} critérios (${scorableCount} pontuáveis)</span>
          </div>
        </div>
        <div class="template-row-actions">
          <button class="btn btn-outline" onclick="appRouter.navigate('template-edit', { id: '${t.id}', version: ${t.version} })">
            <i data-lucide="edit-3"></i>
            <span>Ver/Editar</span>
          </button>
          <button class="btn btn-icon ${t.isActive ? 'btn-deactivate' : 'btn-activate'}" 
                  onclick="toggleTemplateStatus('${t.id}', ${t.version})" 
                  title="${t.isActive ? 'Inativar Template' : 'Ativar Template'}">
            <i data-lucide="${t.isActive ? 'eye-off' : 'eye'}"></i>
          </button>
        </div>
      `;
      container.appendChild(row);
    });
    lucide.createIcons();
  };

  window.toggleTemplateStatus = (id, version) => {
    db.toggleTemplateActive(id, version);
    this.showToast('Status do template atualizado!');
    render();
  };

  render();
};

// --- 5. TEMPLATE BUILDER (CREATE / EDIT) ---
Router.prototype.setupTemplateBuilderView = function(params = {}) {
  const form = document.getElementById('template-builder-form');
  const addCriteriaForm = document.getElementById('add-criteria-form');
  const criteriaListEl = document.getElementById('builder-criteria-list');
  const countEl = document.getElementById('builder-criteria-count');
  const titleEl = document.getElementById('template-builder-title');
  const versionControlBox = document.getElementById('builder-version-control-box');

  // Estado local dos critérios sendo editados
  let localCriteria = [];
  let existingTemplate = null;

  // Ajustes de tela de acordo com criação vs edição
  if (params.id && params.version) {
    existingTemplate = db.getTemplate(params.id, params.version);
    if (existingTemplate) {
      titleEl.innerText = `Editar Template (v${existingTemplate.version})`;
      document.getElementById('builder-template-id').value = existingTemplate.id;
      document.getElementById('builder-template-version').value = existingTemplate.version;
      document.getElementById('builder-template-name').value = existingTemplate.name;
      localCriteria = [...existingTemplate.criteria];
      
      // Exibe caixa de controle de versão (Spec: newVersion = true/false)
      versionControlBox.classList.remove('hide');
      document.querySelector('.current-ver-badge').innerText = `v${existingTemplate.version}`;
      document.querySelector('.next-ver-badge').innerText = `v${existingTemplate.version + 1}`;
    }
  } else {
    titleEl.innerText = 'Criar Novo Template';
    form.reset();
    document.getElementById('builder-template-id').value = '';
    document.getElementById('builder-template-version').value = '1';
    localCriteria = [];
    versionControlBox.classList.add('hide');
  }

  const renderCriteria = () => {
    criteriaListEl.innerHTML = '';
    countEl.innerText = `${localCriteria.length} adicionados`;

    if (localCriteria.length === 0) {
      criteriaListEl.innerHTML = `
        <div class="criteria-empty-list-placeholder">
          Nenhum critério adicionado. Use o painel lateral para adicionar critérios ao seu template.
        </div>
      `;
      return;
    }

    localCriteria.forEach((crit, index) => {
      const row = document.createElement('div');
      row.className = 'criteria-item-row';
      
      let typeLabel = 'Texto';
      if (crit.type === 'bool') typeLabel = 'Sim / Não';
      else if (crit.type === 'range') typeLabel = 'Escala 1-10';

      row.innerHTML = `
        <div class="criteria-item-left">
          <div class="criteria-drag-handle"><i data-lucide="grip-vertical"></i></div>
          <div class="criteria-item-details">
            <span class="crit-name">${crit.label}</span>
            <div class="crit-meta-tags">
              <span class="crit-badge type">${typeLabel}</span>
              ${crit.isScorable ? `<span class="crit-badge scorable">Pontuável</span>` : ''}
              ${crit.isScorable ? `<span class="crit-badge weight">Peso ${crit.weight}x</span>` : ''}
            </div>
          </div>
        </div>
        <button type="button" class="btn btn-icon btn-logout" onclick="removeCriteriaItem(${index})" style="width:32px; height:32px;">
          <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
        </button>
      `;
      criteriaListEl.appendChild(row);
    });
    lucide.createIcons();
  };

  // Manipulação de adicionar critério localmente
  addCriteriaForm.onsubmit = (e) => {
    e.preventDefault();
    const label = document.getElementById('crit-label').value.trim();
    const type = document.getElementById('crit-type').value;
    const isScorable = document.getElementById('crit-is-scorable').checked;
    const weight = parseInt(document.getElementById('crit-weight').value);

    localCriteria.push({
      id: 'crit-' + Math.random().toString(36).substr(2, 9),
      label,
      type,
      isScorable: type === 'text' ? false : isScorable, // texto nunca pontua
      weight: type === 'text' ? 0 : weight
    });

    addCriteriaForm.reset();
    document.getElementById('crit-weight-val').innerText = '1x';
    document.getElementById('crit-weight').value = 1;
    
    renderCriteria();
  };

  window.removeCriteriaItem = (index) => {
    localCriteria.splice(index, 1);
    renderCriteria();
  };

  // Monitoramento dinâmico dos campos de adicionar critério (esconde peso se for Texto)
  const critTypeSelect = document.getElementById('crit-type');
  const scorableWrapper = document.getElementById('crit-scorable-wrapper');
  const weightWrapper = document.getElementById('crit-weight-wrapper');

  critTypeSelect.onchange = () => {
    if (critTypeSelect.value === 'text') {
      scorableWrapper.style.display = 'none';
      weightWrapper.style.display = 'none';
    } else {
      scorableWrapper.style.display = 'block';
      weightWrapper.style.display = 'block';
    }
  };

  // Mostra peso interativamente
  const weightRange = document.getElementById('crit-weight');
  const weightVal = document.getElementById('crit-weight-val');
  weightRange.oninput = () => {
    weightVal.innerText = `${weightRange.value}x`;
  };

  // Salvar Template Final no LocalStorage (simulando API)
  form.onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('builder-template-name').value.trim();
    
    if (localCriteria.length === 0) {
      alert('Adicione pelo menos um critério antes de salvar!');
      return;
    }

    const templateId = document.getElementById('builder-template-id').value;
    const templateVersion = parseInt(document.getElementById('builder-template-version').value);

    let saveMode = 'new';
    if (templateId) {
      const radioMode = document.querySelector('input[name="template-save-version"]:checked').value;
      saveMode = radioMode; // 'overwrite' ou 'new-version'
    }

    const tplData = {
      id: templateId,
      version: templateVersion,
      name,
      criteria: localCriteria
    };

    const saved = db.saveTemplate(tplData, saveMode);
    
    if (saveMode === 'overwrite') {
      this.showToast('Template atualizado com substituição total (PutItem)!');
    } else if (saveMode === 'new-version') {
      this.showToast(`Nova versão gerada com sucesso (v${saved.version})!`);
    } else {
      this.showToast('Novo template v1 criado!');
    }

    this.navigate('templates');
  };

  renderCriteria();
};

// --- 6. NOVA AVALIAÇÃO (EVALUATION CREATE) ---
Router.prototype.setupEvaluationCreateView = function(params = {}) {
  const property = db.getProperty(params.propertyId);
  if (!property) {
    this.navigate('properties');
    return;
  }

  // Preenche dados do cabeçalho
  document.getElementById('eval-property-address').innerText = property.address;
  document.getElementById('eval-property-price').innerText = `R$ ${property.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  document.getElementById('eval-property-id').value = property.id;

  // Botões de navegação da tela de avaliação
  document.getElementById('btn-eval-back').onclick = () => this.navigate('property-details', { id: property.id });
  document.getElementById('btn-eval-cancel').onclick = () => this.navigate('property-details', { id: property.id });

  // Popula Select de templates
  const select = document.getElementById('eval-template-select');
  select.innerHTML = '<option value="">-- Escolha um template --</option>';
  
  const activeTemplates = db.getActiveTemplates();
  activeTemplates.forEach(t => {
    const opt = document.createElement('option');
    opt.value = `${t.id}#${t.version}`;
    opt.innerText = `${t.name} (v${t.version})`;
    select.appendChild(opt);
  });

  const evalForm = document.getElementById('evaluation-form');
  const fieldsContainer = document.getElementById('eval-dynamic-fields-container');
  const scoreSidebar = document.getElementById('eval-sidebar-score-card');
  
  evalForm.classList.add('hide');
  scoreSidebar.classList.add('hide');

  // Estado das respostas e fotos
  let currentAnswers = {};
  let currentUploadedMedia = []; // lista de s3 keys fictícias
  let currentTemplate = null;

  select.onchange = () => {
    const selectedVal = select.value;
    if (!selectedVal) {
      evalForm.classList.add('hide');
      scoreSidebar.classList.add('hide');
      return;
    }

    const [tplId, tplVer] = selectedVal.split('#');
    currentTemplate = db.getTemplate(tplId, tplVer);
    if (!currentTemplate) return;

    evalForm.classList.remove('hide');
    scoreSidebar.classList.remove('hide');

    currentAnswers = {};
    currentUploadedMedia = [];
    document.getElementById('uploaded-photos-preview-grid').innerHTML = '';
    renderDynamicFields(currentTemplate.criteria);
    calculateLiveScore();
  };

  const renderDynamicFields = (criteria) => {
    fieldsContainer.innerHTML = '';
    
    criteria.forEach(crit => {
      const card = document.createElement('div');
      card.className = 'eval-field-card';
      
      const header = document.createElement('div');
      header.className = 'eval-field-header';
      header.innerHTML = `
        <span class="eval-field-label">${crit.label}</span>
        ${crit.isScorable ? `<span class="eval-field-weight-hint">Peso ${crit.weight}x</span>` : ''}
      `;
      card.appendChild(header);

      const controlContainer = document.createElement('div');
      controlContainer.className = 'eval-field-control-wrapper';

      if (crit.type === 'bool') {
        const toggleDiv = document.createElement('div');
        toggleDiv.className = 'eval-control-bool';
        
        const btnYes = document.createElement('button');
        btnYes.type = 'button';
        btnYes.className = 'btn-toggle';
        btnYes.innerText = 'Sim';
        
        const btnNo = document.createElement('button');
        btnNo.type = 'button';
        btnNo.className = 'btn-toggle';
        btnNo.innerText = 'Não';

        btnYes.onclick = () => {
          btnYes.className = 'btn-toggle active-yes';
          btnNo.className = 'btn-toggle';
          currentAnswers[crit.id] = true;
          calculateLiveScore();
        };

        btnNo.onclick = () => {
          btnYes.className = 'btn-toggle';
          btnNo.className = 'btn-toggle active-no';
          currentAnswers[crit.id] = false;
          calculateLiveScore();
        };

        toggleDiv.appendChild(btnYes);
        toggleDiv.appendChild(btnNo);
        controlContainer.appendChild(toggleDiv);

      } else if (crit.type === 'range') {
        const rangeDiv = document.createElement('div');
        rangeDiv.className = 'eval-control-range';
        
        const stepsWrapper = document.createElement('div');
        stepsWrapper.className = 'range-steps-wrapper';
        
        for (let i = 1; i <= 10; i++) {
          const stepBtn = document.createElement('button');
          stepBtn.type = 'button';
          stepBtn.className = 'range-step-btn';
          stepBtn.innerText = i;
          stepBtn.onclick = () => {
            stepsWrapper.querySelectorAll('.range-step-btn').forEach(btn => btn.classList.remove('selected'));
            stepBtn.classList.add('selected');
            currentAnswers[crit.id] = i;
            calculateLiveScore();
          };
          stepsWrapper.appendChild(stepBtn);
        }
        
        rangeDiv.appendChild(stepsWrapper);
        controlContainer.appendChild(rangeDiv);

      } else if (crit.type === 'text') {
        const textarea = document.createElement('textarea');
        textarea.rows = 2;
        textarea.placeholder = 'Digite observações descritivas...';
        textarea.oninput = () => {
          currentAnswers[crit.id] = textarea.value;
        };
        controlContainer.appendChild(textarea);
      }

      card.appendChild(controlContainer);
      fieldsContainer.appendChild(card);
    });
  };

  // Motor de cálculo de score ponderado (Spec-compliance: peso em isScorable)
  const calculateLiveScore = () => {
    let sumWeightedScore = 0;
    let sumWeights = 0;
    let answeredCount = 0;
    let totalScorableCount = 0;

    currentTemplate.criteria.forEach(crit => {
      if (!crit.isScorable) return;
      totalScorableCount++;

      const ans = currentAnswers[crit.id];
      if (ans !== undefined) {
        answeredCount++;
        let normalizedVal = 0;
        
        if (crit.type === 'bool') {
          normalizedVal = ans === true ? 1.0 : 0.0;
        } else if (crit.type === 'range') {
          // Normaliza de 1-10 para escala 0.0 a 1.0 (ou escala direta. range/10)
          normalizedVal = ans / 10;
        }

        sumWeightedScore += normalizedVal * crit.weight;
        sumWeights += crit.weight;
      }
    });

    const finalScore = sumWeights > 0 ? (sumWeightedScore / sumWeights) * 10 : 0.0;

    // Atualiza barra lateral
    const scoreValEl = document.getElementById('live-score-value');
    const scoreBadgeEl = document.getElementById('live-score-badge');
    const scoreCircleEl = document.querySelector('.score-circle');
    
    scoreValEl.innerText = finalScore.toFixed(1);
    document.getElementById('live-score-criteria-count').innerText = `${answeredCount}/${totalScorableCount}`;

    // Remove classes anteriores
    scoreCircleEl.className = 'score-circle';
    scoreBadgeEl.className = 'score-badge';

    if (answeredCount === 0) {
      scoreBadgeEl.innerText = 'Pendente';
      scoreBadgeEl.classList.add('neutral');
    } else if (finalScore >= 7) {
      scoreBadgeEl.innerText = 'Excelente / Bom';
      scoreBadgeEl.classList.add('high');
      scoreCircleEl.classList.add('glow-green');
    } else if (finalScore >= 5) {
      scoreBadgeEl.innerText = 'Regular';
      scoreBadgeEl.classList.add('medium');
      scoreCircleEl.classList.add('glow-yellow');
    } else {
      scoreBadgeEl.innerText = 'Crítico / Ruim';
      scoreBadgeEl.classList.add('low');
      scoreCircleEl.classList.add('glow-red');
    }

    return finalScore;
  };

  // Simulação de upload do S3 via Presigned URL (100% Client-side sandbox)
  const photoZone = document.getElementById('photo-upload-zone');
  const photoInput = document.getElementById('photo-input');
  const previewGrid = document.getElementById('uploaded-photos-preview-grid');

  photoZone.onclick = () => photoInput.click();

  photoInput.onchange = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
      const reader = new FileReader();
      
      // Cria card de preview temporário com spinner de upload para simular PUT S3
      const wrapper = document.createElement('div');
      wrapper.className = 'photo-thumb-wrapper';
      
      const progressOverlay = document.createElement('div');
      progressOverlay.className = 'photo-upload-progress';
      progressOverlay.innerHTML = `
        <div class="progress-spinner"></div>
        <span>S3 UPLOADING...</span>
      `;
      wrapper.appendChild(progressOverlay);
      previewGrid.appendChild(wrapper);

      reader.onload = (event) => {
        // Simulação de chamada POST /api/evaluations/upload-url
        // Devolve: s3Key = "workspace_id/property_id/timestamp_filename.jpg"
        const fakeS3Key = `${db.currentWorkspace}/${property.id}/${Date.now()}_${file.name}`;
        
        // Simulação do PUT Binário direto no S3
        setTimeout(() => {
          progressOverlay.remove(); // retira spinner
          
          const img = document.createElement('img');
          img.src = event.target.result; // salva base64 no DOM apenas para preview
          wrapper.appendChild(img);

          // Botão remover
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'photo-remove-btn';
          removeBtn.innerHTML = '×';
          removeBtn.onclick = () => {
            currentUploadedMedia = currentUploadedMedia.filter(k => k !== fakeS3Key);
            wrapper.remove();
          };
          wrapper.appendChild(removeBtn);

          // Salva key digital
          currentUploadedMedia.push(fakeS3Key);

          // Guarda a imagem em um cache de presigned urls simulado em memória
          // Para podermos visualizar a foto no histórico da avaliação na mesma aba
          if (!window.fakeS3Bucket) window.fakeS3Bucket = {};
          window.fakeS3Bucket[fakeS3Key] = event.target.result;

        }, 1000); // 1s simulando delay de upload
      };

      reader.readAsDataURL(file);
    });
  };

  // Submit da avaliação
  evalForm.onsubmit = (e) => {
    e.preventDefault();

    // Validação se todos os critérios pontuáveis foram respondidos
    const missing = currentTemplate.criteria.filter(crit => crit.isScorable && currentAnswers[crit.id] === undefined);
    if (missing.length > 0) {
      alert(`Por favor, responda todos os critérios avaliativos antes de finalizar. Faltam: ${missing.map(m => m.label).join(', ')}`);
      return;
    }

    const finalScore = calculateLiveScore();
    const evaluation = {
      propertyId: property.id,
      templateId: currentTemplate.id,
      templateVersion: currentTemplate.version,
      finalScore,
      notes: document.getElementById('eval-notes').value.trim(),
      mediaKeys: currentUploadedMedia,
      answers: currentAnswers
    };

    db.saveEvaluation(evaluation);
    this.showToast('Visita e avaliação registradas com sucesso na AWS!');
    this.navigate('property-details', { id: property.id });
  };
};

// --- 7. PROPERTY DETAILS & HISTÓRICO VIEW ---
Router.prototype.renderPropertyDetailsView = function(params = {}) {
  const property = db.getProperty(params.id);
  if (!property) {
    this.navigate('properties');
    return;
  }

  // Preenche dados do Imóvel
  document.getElementById('details-prop-address').innerText = property.address;
  document.getElementById('details-prop-price').innerText = `R$ ${property.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  document.getElementById('details-prop-sqm').innerText = `${property.sqm} m² de área útil`;
  document.getElementById('details-prop-bedrooms').innerText = `${property.bedrooms} dormitório(s)`;
  document.getElementById('details-prop-bathrooms').innerText = `${property.bathrooms} banheiro(s)`;
  document.getElementById('details-prop-parking').innerText = `${property.parking} vaga(s)`;
  
  const linkEl = document.getElementById('details-prop-url');
  const linkContainer = document.getElementById('details-prop-url-container');
  if (property.url) {
    linkContainer.classList.remove('hide');
    linkEl.href = property.url;
  } else {
    linkContainer.classList.add('hide');
  }

  // Ações
  document.getElementById('btn-details-new-eval').onclick = () => this.navigate('evaluation-create', { propertyId: property.id });
  document.getElementById('btn-details-empty-new-eval').onclick = () => this.navigate('evaluation-create', { propertyId: property.id });

  // Lista Histórico de Avaliações
  const historyList = document.getElementById('evaluation-history-list');
  const emptyState = document.getElementById('evaluations-empty-state');
  const evals = db.getPropertyEvaluations(property.id);

  historyList.innerHTML = '';

  if (evals.length === 0) {
    historyList.classList.add('hide');
    emptyState.classList.remove('hide');
    return;
  }

  historyList.classList.remove('hide');
  emptyState.classList.add('hide');

  evals.forEach(ev => {
    const template = db.getTemplate(ev.templateId, ev.templateVersion);
    const templateName = template ? template.name : 'Template Removido';
    const score = ev.finalScore;
    const scoreClass = score >= 7 ? 'high' : score >= 5 ? 'medium' : 'low';
    const dateFormatted = new Date(ev.createdAt).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const card = document.createElement('div');
    card.className = 'history-item-card glass';
    card.onclick = () => openEvaluationDetailsModal(ev, template);
    card.innerHTML = `
      <div class="history-item-left">
        <div class="history-item-score-badge ${scoreClass}">
          <span>${score.toFixed(1)}</span>
        </div>
        <div class="history-item-info">
          <h4>${templateName}</h4>
          <div class="history-item-meta">
            <span><i data-lucide="calendar"></i> ${dateFormatted}</span>
            <span>•</span>
            <span><i data-lucide="image"></i> ${ev.mediaKeys.length} fotos</span>
          </div>
        </div>
      </div>
      <div class="history-item-right">
        <i data-lucide="chevron-right"></i>
      </div>
    `;
    historyList.appendChild(card);
  });
  lucide.createIcons();
};

// --- MODAL DE DETALHES DA AVALIAÇÃO ---
function openEvaluationDetailsModal(evaluation, template) {
  const modal = document.getElementById('evaluation-details-modal');
  
  const dateFormatted = new Date(evaluation.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  document.getElementById('modal-eval-date').innerText = `Realizada em ${dateFormatted}`;
  document.getElementById('modal-eval-score').innerText = evaluation.finalScore.toFixed(1);
  document.getElementById('modal-eval-template').innerText = template ? `${template.name} (v${template.version})` : 'Template Desconhecido';
  
  // Observações
  document.getElementById('modal-eval-notes').innerText = evaluation.notes || 'Nenhuma observação técnica registrada.';

  // Respostas detalhadas
  const answersListEl = document.getElementById('modal-eval-answers');
  answersListEl.innerHTML = '';

  if (template) {
    template.criteria.forEach(crit => {
      const val = evaluation.answers[crit.id];
      const row = document.createElement('div');
      row.className = 'answer-item';
      
      let answerValueHtml = '<span class="crit-ans">Não respondido</span>';
      
      if (val !== undefined) {
        if (crit.type === 'bool') {
          answerValueHtml = val 
            ? '<span class="crit-ans yes"><i data-lucide="check"></i> Sim</span>' 
            : '<span class="crit-ans no"><i data-lucide="x"></i> Não</span>';
        } else if (crit.type === 'range') {
          answerValueHtml = `<span class="crit-ans score-val">${val} / 10</span>`;
        } else {
          answerValueHtml = `<span class="crit-ans text-desc">"${val}"</span>`;
        }
      }

      row.innerHTML = `
        <span class="crit-title">${crit.label}</span>
        ${answerValueHtml}
      `;
      answersListEl.appendChild(row);
    });
  } else {
    answersListEl.innerHTML = '<p class="field-hint">Os critérios originais deste template não foram localizados para re-renderização.</p>';
  }

  // Galeria de Fotos
  const photosGrid = document.getElementById('modal-eval-photos');
  photosGrid.innerHTML = '';

  if (evaluation.mediaKeys && evaluation.mediaKeys.length > 0) {
    evaluation.mediaKeys.forEach(key => {
      // Simula a geração da GET Pre-signed URL
      // Pega o base64 real armazenado localmente em memória se houver, ou usa placeholder gerado
      const imgSrc = (window.fakeS3Bucket && window.fakeS3Bucket[key]) || 'https://via.placeholder.com/150';
      
      const photoItem = document.createElement('div');
      photoItem.className = 'modal-photo-item';
      photoItem.onclick = () => window.open(imgSrc, '_blank');
      photoItem.innerHTML = `<img src="${imgSrc}" alt="Foto Vistoria S3">`;
      photosGrid.appendChild(photoItem);
    });
  } else {
    photosGrid.innerHTML = '<p class="field-hint">Nenhuma foto anexada a esta visita.</p>';
  }

  modal.classList.remove('hide');
  lucide.createIcons();
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Configuração global de logout
  document.getElementById('btn-logout').onclick = () => {
    db.clearUser();
    appRouter.showToast('Sessão encerrada!');
    appRouter.navigate('login');
  };

  // Restaura sessão se houver
  if (db.restoreSession()) {
    document.getElementById('workspace-name-display').innerText = `Workspace: ${db.currentWorkspace.toUpperCase()}`;
    document.getElementById('user-email-display').innerText = db.currentUser;
    document.getElementById('user-avatar-initials').innerText = db.currentUser.substring(0, 2).toUpperCase();
    appRouter.navigate('properties');
  } else {
    appRouter.navigate('login');
  }
});
