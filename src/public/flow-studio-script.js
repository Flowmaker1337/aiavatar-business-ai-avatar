// ============ FLOW STUDIO - VISUAL FLOW BUILDER ============

class FlowStudio {
    constructor() {
        this.currentFlow = null;
        this.reactFlowInstance = null;
        this.selectedNode = null;
        this.nodeIdCounter = 1;
        
        // Node definitions
        this.nodeDefinitions = {
            basic: [
                {
                    type: 'start',
                    name: 'Start',
                    description: 'Punkt początkowy flow',
                    icon: 'fas fa-play',
                    color: '#39e575',
                    inputs: 0,
                    outputs: 1
                },
                {
                    type: 'message',
                    name: 'Wiadomość',
                    description: 'Wyślij wiadomość do użytkownika',
                    icon: 'fas fa-comment',
                    color: '#3b82f6',
                    inputs: 1,
                    outputs: 1
                },
                {
                    type: 'input',
                    name: 'Pytanie',
                    description: 'Zadaj pytanie użytkownikowi',
                    icon: 'fas fa-question',
                    color: '#f59e0b',
                    inputs: 1,
                    outputs: 1
                },
                {
                    type: 'end',
                    name: 'Koniec',
                    description: 'Zakończenie flow',
                    icon: 'fas fa-stop',
                    color: '#ef4444',
                    inputs: 1,
                    outputs: 0
                }
            ],
            logic: [
                {
                    type: 'condition',
                    name: 'Warunek',
                    description: 'Rozgałęzienie na podstawie warunku',
                    icon: 'fas fa-code-branch',
                    color: '#8b5cf6',
                    inputs: 1,
                    outputs: 2
                },
                {
                    type: 'switch',
                    name: 'Przełącznik',
                    description: 'Wybór z wielu opcji',
                    icon: 'fas fa-list',
                    color: '#06b6d4',
                    inputs: 1,
                    outputs: 3
                }
            ],
            ai: [
                {
                    type: 'ai_response',
                    name: 'Odpowiedź AI',
                    description: 'Generuj odpowiedź przez AI',
                    icon: 'fas fa-robot',
                    color: '#10b981',
                    inputs: 1,
                    outputs: 1
                },
                {
                    type: 'intent_check',
                    name: 'Sprawdź Intent',
                    description: 'Rozpoznaj intencję użytkownika',
                    icon: 'fas fa-search',
                    color: '#f97316',
                    inputs: 1,
                    outputs: 2
                }
            ],
            actions: [
                {
                    type: 'api_call',
                    name: 'Wywołanie API',
                    description: 'Wykonaj zapytanie do API',
                    icon: 'fas fa-plug',
                    color: '#ec4899',
                    inputs: 1,
                    outputs: 2
                },
                {
                    type: 'delay',
                    name: 'Opóźnienie',
                    description: 'Pauza przed następnym krokiem',
                    icon: 'fas fa-clock',
                    color: '#64748b',
                    inputs: 1,
                    outputs: 1
                }
            ]
        };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeReactFlow();
        this.loadNodePalette();
        this.loadUserFlows();
        
        console.log('🌊 Flow Studio initialized');
    }

    bindEvents() {
        // Header actions
        document.getElementById('backBtn')?.addEventListener('click', () => this.goBack());
        document.getElementById('newFlowBtn')?.addEventListener('click', () => this.showNewFlowModal());
        document.getElementById('saveFlowBtn')?.addEventListener('click', () => this.saveFlow());
        document.getElementById('testFlowBtn')?.addEventListener('click', () => this.testFlow());
        document.getElementById('publishFlowBtn')?.addEventListener('click', () => this.publishFlow());

        // Flow selector
        document.getElementById('flowSelector')?.addEventListener('change', (e) => {
            this.loadFlow(e.target.value);
        });

        // Toolbar actions
        document.getElementById('selectTool')?.addEventListener('click', () => this.setTool('select'));
        document.getElementById('panTool')?.addEventListener('click', () => this.setTool('pan'));
        document.getElementById('zoomInBtn')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOutBtn')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('fitViewBtn')?.addEventListener('click', () => this.fitView());
        document.getElementById('gridToggle')?.addEventListener('click', () => this.toggleGrid());
        document.getElementById('minimapToggle')?.addEventListener('click', () => this.toggleMinimap());

        // Modal actions
        document.getElementById('modalCloseBtn')?.addEventListener('click', () => this.hideNewFlowModal());
        document.getElementById('modalCancelBtn')?.addEventListener('click', () => this.hideNewFlowModal());
        document.getElementById('modalCreateBtn')?.addEventListener('click', () => this.createNewFlow());

        // Category selection
        document.querySelectorAll('.category').forEach(category => {
            category.addEventListener('click', () => {
                document.querySelectorAll('.category').forEach(c => c.classList.remove('active'));
                category.classList.add('active');
                this.loadNodePalette(category.dataset.category);
            });
        });

        // Node search
        document.getElementById('nodeSearch')?.addEventListener('input', (e) => {
            this.filterNodes(e.target.value);
        });

        // Click outside modal to close
        document.getElementById('flowModalOverlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideNewFlowModal();
            }
        });
    }

    initializeReactFlow() {
        const wrapper = document.getElementById('reactflowWrapper');
        if (!wrapper) return;

        // Create FlowCanvas functional component
        const FlowCanvas = () => {
            const [nodes, setNodes] = window.ReactFlow.useNodesState([]);
            const [edges, setEdges] = window.ReactFlow.useEdgesState([]);
            const reactFlowInstance = React.useRef(null);

            // Store references in class instance
            React.useEffect(() => {
                this.nodes = nodes;
                this.setNodes = setNodes;
                this.edges = edges;
                this.setEdges = setEdges;
            }, [nodes, setNodes, edges, setEdges]);

            const onInit = (instance) => {
                reactFlowInstance.current = instance;
                this.reactFlowInstance = instance;
                console.log('ReactFlow initialized');
            };

            const onNodeClick = (event, node) => {
                console.log('ReactFlow onNodeClick triggered:', node);
                this.onNodeClick(event, node);
            };

            const onNodesChange = (changes) => {
                console.log('Nodes changes:', changes);
                
                // Handle selection changes
                changes.forEach(change => {
                    if (change.type === 'select') {
                        const node = nodes.find(n => n.id === change.id);
                        if (node && change.selected) {
                            console.log('Node selected via onNodesChange:', node);
                            this.onNodeClick(null, node);
                        }
                    }
                });
                
                // Apply changes to nodes
                setNodes(nds => window.ReactFlow.applyNodeChanges(changes, nds));
            };

            const onEdgesChange = (changes) => {
                console.log('Edges changes:', changes);
                setEdges(eds => window.ReactFlow.applyEdgeChanges(changes, eds));
            };

            const onConnect = (connection) => {
                this.onConnect(connection);
            };

            const onNodeDragStop = (event, node) => {
                this.onNodeDragStop(event, node);
            };

            return React.createElement(window.ReactFlow.default, {
                nodes: nodes,
                edges: edges,
                onNodesChange: onNodesChange,
                onEdgesChange: onEdgesChange,
                onConnect: onConnect,
                onNodeClick: onNodeClick,
                onNodeDragStop: onNodeDragStop,
                onInit: onInit,
                nodeTypes: this.getCustomNodeTypes(),
                connectionMode: 'strict',
                snapToGrid: true,
                snapGrid: [20, 20],
                fitView: true,
                nodesConnectable: true,
                nodesDraggable: true,
                elementsSelectable: true,
                attributionPosition: 'bottom-left'
            }, [
                // Background
                React.createElement(window.ReactFlow.Background, {
                    key: 'background',
                    variant: 'dots',
                    gap: 20,
                    size: 1,
                    color: 'rgba(57, 229, 117, 0.2)'
                }),
                
                // Controls
                React.createElement(window.ReactFlow.Controls, {
                    key: 'controls',
                    showZoom: false,
                    showFitView: false,
                    showInteractive: false
                }),
                
                // Minimap
                React.createElement(window.ReactFlow.MiniMap, {
                    key: 'minimap',
                    nodeColor: '#39e575',
                    maskColor: 'rgba(0, 0, 0, 0.8)',
                    style: { display: 'none' },
                    id: 'minimap'
                })
            ]);
        };

        // Render FlowCanvas component
        const root = ReactDOM.createRoot(wrapper);
        root.render(React.createElement(FlowCanvas));
    }

    getCustomNodeTypes() {
        const self = this; // Capture reference to FlowStudio instance
        
        return {
            flowNode: ({ data, selected }) => {
                const nodeType = self.getNodeTypeDefinition(data.type);
                
                const hasInputs = nodeType?.inputs > 0;
                const hasOutputs = nodeType?.outputs > 0;
                
                return React.createElement('div', {
                    className: `flow-node ${selected ? 'selected' : ''}`,
                    style: {
                        background: selected ? 'rgba(57, 229, 117, 0.2)' : 'rgba(0, 0, 0, 0.8)',
                        border: `2px solid ${selected ? '#39e575' : nodeType?.color || '#888888'}`,
                        borderRadius: '12px',
                        padding: '16px',
                        minWidth: '160px',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: selected ? '0 0 20px rgba(57, 229, 117, 0.5)' : '0 2px 8px rgba(0, 0, 0, 0.3)',
                        position: 'relative'
                    }
                }, [
                    // Input Handle (left side)
                    hasInputs && React.createElement(window.ReactFlow.Handle, {
                        key: 'input-handle',
                        type: 'target',
                        position: 'left',
                        style: {
                            background: '#39e575',
                            border: '2px solid #ffffff',
                            width: '12px',
                            height: '12px'
                        }
                    }),
                    
                    // Node header
                    React.createElement('div', {
                        key: 'header',
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px'
                        }
                    }, [
                        React.createElement('i', {
                            key: 'icon',
                            className: nodeType?.icon || 'fas fa-circle',
                            style: {
                                color: nodeType?.color || '#888888',
                                fontSize: '16px'
                            }
                        }),
                        React.createElement('span', {
                            key: 'title',
                            style: { fontWeight: '600' }
                        }, data.label || nodeType?.name || 'Node')
                    ]),
                    
                    // Node description
                    data.description && React.createElement('div', {
                        key: 'description',
                        style: {
                            color: '#888888',
                            fontSize: '12px',
                            lineHeight: '1.4'
                        }
                    }, data.description),
                    
                    // Output Handle (right side)
                    hasOutputs && React.createElement(window.ReactFlow.Handle, {
                        key: 'output-handle',
                        type: 'source',
                        position: 'right',
                        style: {
                            background: '#39e575',
                            border: '2px solid #ffffff',
                            width: '12px',
                            height: '12px'
                        }
                    })
                ]);
            }
        };
    }

    getNodeTypeDefinition(type) {
        for (const category of Object.values(this.nodeDefinitions)) {
            const nodeType = category.find(node => node.type === type);
            if (nodeType) return nodeType;
        }
        return null;
    }

    loadNodePalette(category = 'basic') {
        const paletteNodes = document.getElementById('paletteNodes');
        if (!paletteNodes) return;

        const nodes = this.nodeDefinitions[category] || [];
        
        paletteNodes.innerHTML = nodes.map(node => `
            <div class="node-item" draggable="true" data-node-type="${node.type}">
                <div class="node-icon" style="background: ${node.color}">
                    <i class="${node.icon}"></i>
                </div>
                <div class="node-name">${node.name}</div>
                <div class="node-description">${node.description}</div>
            </div>
        `).join('');

        // Add drag event listeners
        paletteNodes.querySelectorAll('.node-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/reactflow', JSON.stringify({
                    nodeType: item.dataset.nodeType
                }));
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('click', () => {
                this.addNodeToCanvas(item.dataset.nodeType);
            });
        });
    }

    addNodeToCanvas(nodeType, position = null) {
        if (!this.setNodes) return;

        const nodeDefinition = this.getNodeTypeDefinition(nodeType);
        if (!nodeDefinition) return;

        const newNode = {
            id: `node_${this.nodeIdCounter++}`,
            type: 'flowNode',
            position: position || { x: Math.random() * 300, y: Math.random() * 300 },
            data: {
                type: nodeType,
                label: nodeDefinition.name,
                description: nodeDefinition.description
            }
        };

        this.setNodes((nodes) => [...nodes, newNode]);
        this.showNotification(`Dodano węzeł: ${nodeDefinition.name}`, 'success');
    }

    onReactFlowInit(instance) {
        this.reactFlowInstance = instance;
        console.log('ReactFlow initialized');
    }

    onNodesChange(changes) {
        // Handle node changes
        console.log('Nodes changed:', changes);
    }

    onEdgesChange(changes) {
        // Handle edge changes
        console.log('Edges changed:', changes);
    }

    onConnect(connection) {
        // Handle new connections
        console.log('New connection attempt:', connection);
        
        if (!this.setEdges || !this.edges) {
            console.log('Missing setEdges or edges');
            return;
        }

        // Check if source node already has an outgoing connection
        const existingOutgoing = this.edges.find(edge => edge.source === connection.source);
        if (existingOutgoing) {
            this.showNotification('Węzeł może mieć tylko jedno wyjście', 'warning');
            return;
        }

        // Check if target node already has an incoming connection
        const existingIncoming = this.edges.find(edge => edge.target === connection.target);
        if (existingIncoming) {
            this.showNotification('Węzeł może mieć tylko jedno wejście', 'warning');
            return;
        }

        // Check if trying to connect to itself
        if (connection.source === connection.target) {
            this.showNotification('Nie można połączyć węzła z samym sobą', 'warning');
            return;
        }

        // Create new edge
        const newEdge = {
            id: `edge_${connection.source}_${connection.target}`,
            source: connection.source,
            target: connection.target,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#39e575', strokeWidth: 2 }
        };
        
        this.setEdges(edges => [...edges, newEdge]);
        
        // Update next_steps in source node
        this.updateNodeNextSteps(connection.source, connection.target);
        
        this.showNotification('Połączenie utworzone', 'success');
    }

    updateNodeNextSteps(sourceNodeId, targetNodeId) {
        if (!this.setNodes || !this.nodes) return;

        this.setNodes(nodes => 
            nodes.map(node => {
                if (node.id === sourceNodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            next_steps: [targetNodeId]
                        }
                    };
                }
                return node;
            })
        );
    }

    onNodeClick(event, node) {
        console.log('Node clicked:', node);
        this.selectedNode = node;
        this.updatePropertiesPanel(node);
    }

    onNodeDragStop(event, node) {
        console.log('Node moved:', node.id, node.position);
    }

    updatePropertiesPanel(node) {
        console.log('Updating properties panel for node:', node);
        const propertiesContent = document.getElementById('propertiesContent');
        console.log('Properties content element:', propertiesContent);
        
        if (!propertiesContent || !node) {
            console.log('Missing element or node:', { propertiesContent, node });
            return;
        }

        const nodeDefinition = this.getNodeTypeDefinition(node.data.type);
        console.log('Node definition:', nodeDefinition);
        
        propertiesContent.innerHTML = `
            <div class="property-section">
                <div class="property-header">
                    <h4>Węzeł: ${nodeDefinition?.name || 'Unknown'}</h4>
                    <button class="btn-danger btn-small" onclick="flowStudio.deleteSelectedNode()" title="Usuń węzeł">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                
                <div class="form-group">
                    <label for="nodeLabel">Etykieta</label>
                    <input type="text" id="nodeLabel" value="${node.data.label || ''}" 
                           onchange="flowStudio.updateNodeProperty('label', this.value)">
                </div>
                
                <div class="form-group">
                    <label for="nodeDescription">Opis</label>
                    <textarea id="nodeDescription" rows="3" 
                              onchange="flowStudio.updateNodeProperty('description', this.value)">${node.data.description || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="nodeIntentName">Intent Name</label>
                    <input type="text" id="nodeIntentName" value="${node.data.intent_name || ''}" 
                           onchange="flowStudio.updateNodeProperty('intent_name', this.value)"
                           placeholder="np. greeting, ask_question">
                    <div class="input-hint">Nazwa intencji która wyzwala ten krok</div>
                </div>
                
                <div class="form-group">
                    <label for="nodeSystemPrompt">System Prompt</label>
                    <textarea id="nodeSystemPrompt" rows="4" 
                              onchange="flowStudio.updateNodeProperty('system_prompt', this.value)"
                              placeholder="Instrukcja dla AI jak ma się zachowywać w tym kroku...">${node.data.system_prompt || ''}</textarea>
                    <div class="input-hint">Instrukcja systemowa dla AI w tym kroku</div>
                </div>
                
                <div class="form-group">
                    <label for="nodeUserPrompt">User Prompt Template</label>
                    <textarea id="nodeUserPrompt" rows="4" 
                              onchange="flowStudio.updateNodeProperty('user_prompt_template', this.value)"
                              placeholder="Template dla user prompt z zmiennymi {{variable}}...">${node.data.user_prompt_template || ''}</textarea>
                    <div class="input-hint">Template dla user prompt z zmiennymi</div>
                </div>
                
                <div class="form-group">
                    <label for="nodeVariables">Variables</label>
                    <input type="text" id="nodeVariables" value="${(node.data.variables || []).join(', ')}" 
                           onchange="flowStudio.updateNodeProperty('variables', this.value.split(',').map(s => s.trim()).filter(s => s))"
                           placeholder="user_message, npc_persona.firstName, rag_context">
                    <div class="input-hint">Dostępne zmienne w promptach (oddzielone przecinkami)</div>
                </div>
                
                <div class="form-group">
                    <label for="nodeNextSteps">Next Steps</label>
                    <input type="text" id="nodeNextSteps" value="${(node.data.next_steps || []).join(', ')}" 
                           onchange="flowStudio.updateNodeProperty('next_steps', this.value.split(',').map(s => s.trim()).filter(s => s))"
                           placeholder="step_id_1, step_id_2">
                    <div class="input-hint">ID następnych kroków (oddzielone przecinkami)</div>
                </div>
                
                <div class="form-group">
                    <label for="nodePriority">Priority</label>
                    <input type="number" id="nodePriority" value="${node.data.priority || 5}" 
                           onchange="flowStudio.updateNodeProperty('priority', parseInt(this.value))"
                           min="1" max="10">
                    <div class="input-hint">Priorytet kroku (1-10, wyższy = ważniejszy)</div>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="nodeRequired" ${node.data.required ? 'checked' : ''} 
                               onchange="flowStudio.updateNodeProperty('required', this.checked)">
                        Wymagany krok
                    </label>
                </div>
                
                ${this.getNodeSpecificProperties(node)}
            </div>
        `;
    }

    getNodeSpecificProperties(node) {
        switch (node.data.type) {
            case 'message':
                return `
                    <div class="form-group">
                        <label for="messageText">Treść wiadomości</label>
                        <textarea id="messageText" rows="4" placeholder="Wpisz treść wiadomości..."
                                  onchange="flowStudio.updateNodeProperty('message', this.value)">${node.data.message || ''}</textarea>
                    </div>
                `;
            case 'input':
                return `
                    <div class="form-group">
                        <label for="questionText">Pytanie</label>
                        <textarea id="questionText" rows="3" placeholder="Wpisz pytanie..."
                                  onchange="flowStudio.updateNodeProperty('question', this.value)">${node.data.question || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="inputType">Typ odpowiedzi</label>
                        <select id="inputType" onchange="flowStudio.updateNodeProperty('inputType', this.value)">
                            <option value="text" ${node.data.inputType === 'text' ? 'selected' : ''}>Tekst</option>
                            <option value="number" ${node.data.inputType === 'number' ? 'selected' : ''}>Liczba</option>
                            <option value="email" ${node.data.inputType === 'email' ? 'selected' : ''}>Email</option>
                            <option value="phone" ${node.data.inputType === 'phone' ? 'selected' : ''}>Telefon</option>
                        </select>
                    </div>
                `;
            case 'condition':
                return `
                    <div class="form-group">
                        <label for="conditionExpression">Warunek</label>
                        <input type="text" id="conditionExpression" placeholder="np. input.length > 10"
                               onchange="flowStudio.updateNodeProperty('condition', this.value)"
                               value="${node.data.condition || ''}">
                    </div>
                `;
            default:
                return '';
        }
    }

    updateNodeProperty(property, value) {
        if (!this.selectedNode || !this.setNodes) return;

        // Special handling for intent_name - auto-fill prompts
        if (property === 'intent_name' && value && this.promptTemplates) {
            const template = this.promptTemplates.find(t => t.intent === value);
            if (template) {
                // Auto-fill system prompt, user prompt and variables
                this.setNodes(nodes => 
                    nodes.map(node => {
                        if (node.id === this.selectedNode.id) {
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    intent_name: value,
                                    system_prompt: template.system_prompt || node.data.system_prompt,
                                    user_prompt_template: template.user_prompt_template || node.data.user_prompt_template,
                                    variables: template.variables || node.data.variables,
                                    priority: template.priority || node.data.priority
                                }
                            };
                        }
                        return node;
                    })
                );

                // Update selected node reference
                this.selectedNode.data.intent_name = value;
                this.selectedNode.data.system_prompt = template.system_prompt || this.selectedNode.data.system_prompt;
                this.selectedNode.data.user_prompt_template = template.user_prompt_template || this.selectedNode.data.user_prompt_template;
                this.selectedNode.data.variables = template.variables || this.selectedNode.data.variables;
                this.selectedNode.data.priority = template.priority || this.selectedNode.data.priority;

                // Refresh properties panel
                this.updatePropertiesPanel(this.selectedNode);
                
                this.showNotification(`Auto-wypełniono prompty dla intent: ${value}`, 'success');
                return;
            }
        }

        // Update node data
        this.setNodes(nodes => 
            nodes.map(node => 
                node.id === this.selectedNode.id 
                    ? { ...node, data: { ...node.data, [property]: value } }
                    : node
            )
        );

        // Update selected node reference
        this.selectedNode.data[property] = value;
    }

    deleteSelectedNode() {
        if (!this.selectedNode || !this.setNodes) return;

        const nodeId = this.selectedNode.id;
        
        // Remove connected edges first
        if (this.setEdges) {
            this.setEdges(edges => edges.filter(edge => 
                edge.source !== nodeId && edge.target !== nodeId
            ));
        }

        // Update next_steps in other nodes that pointed to this node
        this.setNodes(nodes => 
            nodes.filter(node => node.id !== nodeId) // Remove the node
                 .map(node => ({
                     ...node,
                     data: {
                         ...node.data,
                         next_steps: (node.data.next_steps || []).filter(step => step !== nodeId)
                     }
                 }))
        );
        
        // Clear selection
        this.selectedNode = null;
        this.clearPropertiesPanel();
        
        this.showNotification('Węzeł został usunięty', 'success');
    }

    clearPropertiesPanel() {
        const propertiesContent = document.getElementById('propertiesContent');
        if (propertiesContent) {
            propertiesContent.innerHTML = `
                <div class="no-selection">
                    <i class="fas fa-mouse-pointer"></i>
                    <p>Wybierz węzeł aby edytować właściwości</p>
                </div>
            `;
        }
    }

    // Toolbar actions
    setTool(tool) {
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${tool}Tool`)?.classList.add('active');
        
        // Implement tool logic here
        console.log('Tool selected:', tool);
    }

    zoomIn() {
        if (this.reactFlowInstance) {
            this.reactFlowInstance.zoomIn();
        }
    }

    zoomOut() {
        if (this.reactFlowInstance) {
            this.reactFlowInstance.zoomOut();
        }
    }

    fitView() {
        if (this.reactFlowInstance) {
            this.reactFlowInstance.fitView({ padding: 0.2 });
        }
    }

    toggleGrid() {
        const background = document.querySelector('.react-flow__background');
        if (background) {
            background.style.display = background.style.display === 'none' ? 'block' : 'none';
        }
    }

    toggleMinimap() {
        const minimap = document.getElementById('minimap');
        if (minimap) {
            minimap.style.display = minimap.style.display === 'none' ? 'block' : 'none';
        }
    }

    // Flow management
    showNewFlowModal() {
        document.getElementById('flowModalOverlay')?.classList.add('active');
        document.getElementById('flowName')?.focus();
    }

    hideNewFlowModal() {
        document.getElementById('flowModalOverlay')?.classList.remove('active');
        // Clear form
        document.getElementById('flowName').value = '';
        document.getElementById('flowDescription').value = '';
        document.getElementById('flowCategory').value = 'sales';
    }

    async createNewFlow() {
        const name = document.getElementById('flowName')?.value?.trim();
        const description = document.getElementById('flowDescription')?.value?.trim();
        const category = document.getElementById('flowCategory')?.value;

        if (!name) {
            this.showNotification('Podaj nazwę flow', 'error');
            return;
        }

        try {
            // Create new flow with start node
            const newFlow = {
                id: `flow_${Date.now()}`,
                name,
                description,
                category,
                nodes: [{
                    id: 'start_1',
                    type: 'flowNode',
                    position: { x: 100, y: 100 },
                    data: {
                        type: 'start',
                        label: 'Start',
                        description: 'Punkt początkowy flow'
                    }
                }],
                edges: [],
                created_at: new Date().toISOString()
            };

            // Save flow (mock for now)
            this.currentFlow = newFlow;
            this.loadFlowToCanvas(newFlow);
            this.addFlowToSelector(newFlow);
            
            this.hideNewFlowModal();
            this.showNotification(`Flow "${name}" został utworzony!`, 'success');
            
        } catch (error) {
            console.error('Error creating flow:', error);
            this.showNotification('Błąd podczas tworzenia flow', 'error');
        }
    }

    loadFlowToCanvas(flow) {
        if (!this.setNodes || !this.setEdges || !flow) return;

        this.setNodes(flow.nodes || []);
        this.setEdges(flow.edges || []);
        
        setTimeout(() => {
            if (this.reactFlowInstance) {
                this.reactFlowInstance.fitView({ padding: 0.2 });
            }
        }, 100);
    }

    addFlowToSelector(flow) {
        const selector = document.getElementById('flowSelector');
        if (!selector) return;

        const option = document.createElement('option');
        option.value = flow.id;
        option.textContent = flow.name;
        option.selected = true;
        selector.appendChild(option);
    }

    async loadPromptTemplates() {
        try {
            const response = await fetch('/api/prompt-templates');
            if (response.ok) {
                const data = await response.json();
                this.promptTemplates = data.templates || [];
                console.log(`✅ Loaded ${this.promptTemplates.length} prompt templates`);
            }
        } catch (error) {
            console.error('Error loading prompt templates:', error);
            this.promptTemplates = [];
        }
    }

    async loadUserFlows() {
        try {
            // Load prompt templates first
            await this.loadPromptTemplates();
            
            // Load flows for different avatar types
            const avatarTypes = ['networker', 'trainer'];
            const allFlows = [];

            // Load flows for each avatar type
            for (const avatarType of avatarTypes) {
                try {
                    const response = await fetch(`/api/flows?avatar_type=${avatarType}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.status === 'success' && data.flows) {
                            data.flows.forEach(flow => {
                                allFlows.push({
                                    ...flow,
                                    avatar_type: avatarType,
                                    display_name: `[${avatarType.toUpperCase()}] ${flow.name}`
                                });
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Error loading flows for ${avatarType}:`, error);
                }
            }

            // Also load custom avatar flows (if any)
            try {
                // Get list of custom avatars first
                const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
                if (token) {
                    const avatarsResponse = await fetch('/api/avatars', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (avatarsResponse.ok) {
                        const avatarsData = await avatarsResponse.json();
                        if (avatarsData.success && avatarsData.avatars) {
                            for (const avatar of avatarsData.avatars) {
                                try {
                                    const flowsResponse = await fetch(`/api/avatar/${avatar.id}/flow-definitions`);
                                    if (flowsResponse.ok) {
                                        const flowsData = await flowsResponse.json();
                                        if (flowsData.status === 'success' && flowsData.flows) {
                                            flowsData.flows.forEach(flow => {
                                                allFlows.push({
                                                    ...flow,
                                                    avatar_type: 'custom',
                                                    avatar_id: avatar.id,
                                                    avatar_name: avatar.name,
                                                    display_name: `[${avatar.name}] ${flow.name}`
                                                });
                                            });
                                        }
                                    }
                                } catch (error) {
                                    console.error(`Error loading flows for custom avatar ${avatar.name}:`, error);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading custom avatar flows:', error);
            }

            // Populate selector
            const selector = document.getElementById('flowSelector');
            if (selector) {
                // Clear existing options except first
                while (selector.children.length > 1) {
                    selector.removeChild(selector.lastChild);
                }

                // Add loaded flows
                allFlows.forEach(flow => {
                    const option = document.createElement('option');
                    option.value = flow.id;
                    option.textContent = flow.display_name;
                    option.dataset.avatarType = flow.avatar_type;
                    option.dataset.avatarId = flow.avatar_id || '';
                    option.dataset.flowData = JSON.stringify(flow);
                    selector.appendChild(option);
                });

                console.log(`✅ Loaded ${allFlows.length} flows from system`);
            }
            
        } catch (error) {
            console.error('Error loading flows:', error);
            this.showNotification('Błąd podczas ładowania flows', 'error');
        }
    }

    async loadFlow(flowId) {
        if (!flowId) {
            this.clearCanvas();
            return;
        }
        
        try {
            this.showNotification('Ładowanie flow...', 'info');
            
            // Get flow data from selector option
            const selector = document.getElementById('flowSelector');
            const selectedOption = selector.querySelector(`option[value="${flowId}"]`);
            
            if (!selectedOption || !selectedOption.dataset.flowData) {
                throw new Error('Flow data not found');
            }
            
            const flowData = JSON.parse(selectedOption.dataset.flowData);
            console.log('Loading flow:', flowData);
            
            // Convert flow steps to nodes
            const nodes = this.convertFlowToNodes(flowData);
            const edges = this.convertFlowToEdges(flowData);
            
            // Load to canvas
            if (this.setNodes && this.setEdges) {
                this.setNodes(nodes);
                this.setEdges(edges);
                
                // Set as current flow
                this.currentFlow = {
                    ...flowData,
                    nodes: nodes,
                    edges: edges
                };
                
                // Fit view after loading
                setTimeout(() => {
                    if (this.reactFlowInstance) {
                        this.reactFlowInstance.fitView({ padding: 0.2 });
                    }
                }, 100);
                
                this.showNotification(`Flow "${flowData.name}" załadowany!`, 'success');
            }
            
        } catch (error) {
            console.error('Error loading flow:', error);
            this.showNotification(`Błąd podczas ładowania flow: ${error.message}`, 'error');
        }
    }

    convertFlowToNodes(flowData) {
        const nodes = [];
        const steps = flowData.steps || [];
        
        // Create nodes for each step
        steps.forEach((step, index) => {
            const nodeType = this.getNodeTypeForStep(step);
            
            // Find matching prompt template for this step's intent
            let promptTemplate = null;
            let inferredIntent = step.intent_name;
            
            // If no intent_name, try to infer from step id/name and flow entry_intents
            if (!inferredIntent && this.promptTemplates) {
                // Try to map step to intent based on step id patterns
                inferredIntent = this.inferIntentFromStep(step, flowData);
            }
            
            if (inferredIntent && this.promptTemplates) {
                promptTemplate = this.promptTemplates.find(t => t.intent === inferredIntent);
                if (promptTemplate) {
                    console.log(`✅ Mapped step "${step.id}" to intent "${inferredIntent}"`);
                }
            }
            
            const node = {
                id: step.id,
                type: 'flowNode',
                position: { 
                    x: 100 + (index * 250), 
                    y: 100 + Math.floor(index / 4) * 200 
                },
                data: {
                    type: nodeType,
                    label: step.name || step.id,
                    description: step.description || '',
                    intent_name: inferredIntent || step.intent_name || '',
                    next_steps: step.next_steps || [],
                    required: step.required || false,
                    // Add prompt template data if found
                    system_prompt: promptTemplate?.system_prompt || step.system_prompt || '',
                    user_prompt_template: promptTemplate?.user_prompt_template || step.user_prompt_template || '',
                    variables: promptTemplate?.variables || step.variables || [],
                    priority: promptTemplate?.priority || step.priority || 5,
                    // Copy all original step data
                    ...step
                }
            };
            
            nodes.push(node);
        });
        
        return nodes;
    }

    convertFlowToEdges(flowData) {
        const edges = [];
        const steps = flowData.steps || [];
        
        // Create edges based on next_steps
        steps.forEach(step => {
            if (step.next_steps && step.next_steps.length > 0) {
                step.next_steps.forEach(nextStepId => {
                    // Check if target step exists
                    const targetExists = steps.some(s => s.id === nextStepId);
                    if (targetExists) {
                        const edge = {
                            id: `edge_${step.id}_${nextStepId}`,
                            source: step.id,
                            target: nextStepId,
                            type: 'smoothstep',
                            animated: true,
                            style: { stroke: '#39e575', strokeWidth: 2 }
                        };
                        edges.push(edge);
                    }
                });
            }
        });
        
        return edges;
    }

    inferIntentFromStep(step, flowData) {
        // Map step IDs/names to intents based on common patterns
        const stepId = step.id.toLowerCase();
        const stepName = (step.name || '').toLowerCase();
        const flowEntryIntents = flowData.entry_intents || [];
        
        // Direct mappings based on step ID patterns
        if (stepId.includes('greeting') || stepId.includes('initial_greeting')) {
            return 'greeting';
        }
        if (stepId.includes('company_intro') || stepId.includes('company_overview')) {
            return 'ask_about_npc_firm';
        }
        if (stepId.includes('user_question') || stepId.includes('answer_question')) {
            return 'user_questions';
        }
        if (stepId.includes('solution') || stepId.includes('value_proposition')) {
            return 'solution_presentation';
        }
        if (stepId.includes('need') || stepId.includes('gather_info')) {
            return 'user_needs_gathering';
        }
        if (stepId.includes('comment') || stepId.includes('feedback')) {
            return 'user_comments';
        }
        if (stepId.includes('expectation') || stepId.includes('expect')) {
            return 'user_expectations';
        }
        
        // For training flows
        if (stepId.includes('theory') || stepName.includes('teoria')) {
            return 'theory_request';
        }
        if (stepId.includes('practice') || stepName.includes('praktyk')) {
            return 'practice_together';
        }
        if (stepId.includes('guide') || stepName.includes('przewodnik')) {
            return 'guide_me';
        }
        if (stepId.includes('what_is') || stepName.includes('co to')) {
            return 'what_is';
        }
        if (stepId.includes('show_me') || stepName.includes('pokaż')) {
            return 'show_me_how';
        }
        
        // If flow has entry_intents, use the first one as fallback
        if (flowEntryIntents.length > 0) {
            return flowEntryIntents[0];
        }
        
        // Default fallback
        return 'user_questions';
    }

    getNodeTypeForStep(step) {
        // Try to determine node type based on step properties
        if (step.id.includes('greeting') || step.id.includes('start')) {
            return 'start';
        }
        if (step.id.includes('end') || step.id.includes('complete')) {
            return 'end';
        }
        if (step.id.includes('question') || step.id.includes('input')) {
            return 'input';
        }
        if (step.id.includes('condition') || step.id.includes('check')) {
            return 'condition';
        }
        if (step.id.includes('ai') || step.id.includes('response')) {
            return 'ai_response';
        }
        
        // Default to message node
        return 'message';
    }

    clearCanvas() {
        if (this.setNodes && this.setEdges) {
            this.setNodes([]);
            this.setEdges([]);
        }
        this.currentFlow = null;
        this.selectedNode = null;
        this.clearPropertiesPanel();
    }

    async saveFlow() {
        if (!this.currentFlow || !this.nodes || !this.edges) {
            this.showNotification('Brak aktywnego flow do zapisania', 'warning');
            return;
        }

        try {
            // Convert nodes back to steps format
            const steps = this.convertNodesToSteps(this.nodes);
            
            // Update flow data
            const updatedFlow = {
                ...this.currentFlow,
                steps: steps,
                updated_at: new Date().toISOString()
            };

            // Save to system (for now just log - later we'll add API endpoint)
            console.log('Saving flow to system:', updatedFlow);
            
            // Show save data for now
            this.showFlowSaveData(updatedFlow);
            
            this.showNotification('Flow zapisany pomyślnie!', 'success');
            
        } catch (error) {
            console.error('Error saving flow:', error);
            this.showNotification('Błąd podczas zapisywania flow', 'error');
        }
    }

    convertNodesToSteps(nodes) {
        return nodes.map(node => {
            const stepData = {
                id: node.id,
                name: node.data.label || node.data.name || node.id,
                description: node.data.description || '',
                required: node.data.required || false,
                next_steps: node.data.next_steps || []
            };

            // Add intent_name if present
            if (node.data.intent_name) {
                stepData.intent_name = node.data.intent_name;
            }

            // Add node-specific properties
            switch (node.data.type) {
                case 'message':
                    if (node.data.message) stepData.message = node.data.message;
                    break;
                case 'input':
                    if (node.data.question) stepData.question = node.data.question;
                    if (node.data.inputType) stepData.input_type = node.data.inputType;
                    break;
                case 'condition':
                    if (node.data.condition) stepData.condition = node.data.condition;
                    break;
            }

            return stepData;
        });
    }

    showFlowSaveData(flowData) {
        // Create modal to show save data
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 80vh;">
                <div class="modal-header">
                    <h3>Flow Data - ${flowData.name}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Dane flow do zapisania w systemie:</p>
                    <textarea readonly style="width: 100%; height: 400px; font-family: monospace; font-size: 12px; background: #1a1a1a; color: #39e575; border: 1px solid #333; border-radius: 4px; padding: 12px;">${JSON.stringify(flowData, null, 2)}</textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="navigator.clipboard.writeText(\`${JSON.stringify(flowData, null, 2).replace(/`/g, '\\`')}\`)">
                        <i class="fas fa-copy"></i>
                        Kopiuj JSON
                    </button>
                    <button class="btn-primary" onclick="this.closest('.modal-overlay').remove()">
                        Zamknij
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    testFlow() {
        if (!this.currentFlow) {
            this.showNotification('Wybierz flow do testowania', 'warning');
            return;
        }

        this.showNotification('Funkcja testowania będzie dostępna wkrótce', 'info');
    }

    publishFlow() {
        if (!this.currentFlow) {
            this.showNotification('Wybierz flow do publikacji', 'warning');
            return;
        }

        this.showNotification('Funkcja publikacji będzie dostępna wkrótce', 'info');
    }

    filterNodes(searchTerm) {
        const nodeItems = document.querySelectorAll('.node-item');
        const term = searchTerm.toLowerCase();
        
        nodeItems.forEach(item => {
            const name = item.querySelector('.node-name')?.textContent?.toLowerCase() || '';
            const description = item.querySelector('.node-description')?.textContent?.toLowerCase() || '';
            
            if (name.includes(term) || description.includes(term)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    goBack() {
        if (window.homepageApp) {
            window.homepageApp.navigateToPage('dashboard');
        } else {
            window.location.href = '/';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: #ffffff;
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 1001;
            animation: slideInRight 0.3s ease forwards;
        `;

        document.body.appendChild(notification);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            success: '#39e575',
            error: '#ff6b6b',
            warning: '#ffa502',
            info: '#3742fa'
        };
        return colors[type] || '#3742fa';
    }
}

// Global instance
let flowStudio;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    flowStudio = new FlowStudio();
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes slideOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
        
        .flow-node {
            transition: all 0.3s ease;
        }
        
        .flow-node:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(57, 229, 117, 0.4);
        }
    `;
    document.head.appendChild(style);
});

// Export for global access
window.flowStudio = flowStudio;
