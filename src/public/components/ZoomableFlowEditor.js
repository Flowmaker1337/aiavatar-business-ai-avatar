    // ZoomableFlowEditor - ReactFlow container + custom card nodes (bez edges)
    const ZoomableFlowEditor = ({ flowDefinitions = [], activeFlow = null, onNodeClick = () => {}, editable = false }) => {
        const [nodes, setNodes, onNodesChange] = window.ReactFlow.useNodesState([]);
        const [edges, setEdges, onEdgesChange] = window.ReactFlow.useEdgesState([]);
        const [selectedNode, setSelectedNode] = React.useState(null);
        const [showNodeDialog, setShowNodeDialog] = React.useState(false);

        // Get prompt templates and intent definitions  
        const [promptTemplates, setPromptTemplates] = React.useState([]);
        const [intentDefinitions, setIntentDefinitions] = React.useState([]);

        React.useEffect(() => {
            // Load templates
            fetch('/api/prompt-templates')
                .then(response => response.json())
                .then(data => {
                    console.log('🔧 ZoomableFlowEditor: Raw prompt templates response:', data);
                    const templates = Array.isArray(data) ? data : (data?.templates || []);
                    console.log('🔧 ZoomableFlowEditor: Loaded prompt templates:', templates.length);
                    setPromptTemplates(templates);
                })
                .catch(error => {
                    console.error('Failed to load prompt templates:', error);
                    setPromptTemplates([]);
                });

            // Load intent definitions
            fetch('/api/intent-definitions')
                .then(response => response.json())
                .then(data => {
                    console.log('🔧 ZoomableFlowEditor: Raw intent definitions response:', data);
                    const definitions = Array.isArray(data) ? data : (data?.definitions || []);
                    console.log('🔧 ZoomableFlowEditor: Loaded intent definitions:', definitions.length);
                    setIntentDefinitions(definitions);
                })
                .catch(error => {
                    console.error('Failed to load intent definitions:', error);
                    setIntentDefinitions([]);
                });
        }, []);

        // Smart mapping for step IDs to intents (same as FlowCardEditor)
        const stepToIntentMap = {
            // Business Flow mappings
            'initial_greeting': 'greeting',
            'company_introduction': 'ask_about_npc_firm',
            'conversation_opener': 'greeting',
            'company_overview': 'ask_about_npc_firm',
            'services_presentation': 'solution_presentation',
            'value_proposition': 'solution_presentation',
            'examples_cases': 'solution_presentation',
            'user_background': 'user_firm_info',
            'business_challenges': 'user_needs',
            'goals_expectations': 'user_expectations',
            'deep_questions': 'user_questions',
            'solution_overview': 'solution_presentation',
            'detailed_proposal': 'solution_presentation',
            'implementation_plan': 'solution_presentation',
            'acknowledge_redirect': 'conversation_redirect',
            'contact_collection': 'conversation_redirect',
            'next_steps': 'conversation_redirect',
            'basic_company_info': 'user_firm_info',
            'business_model': 'user_firm_info',
            'target_market': 'user_firm_info',
            'current_challenges': 'user_needs',
            'pain_points': 'user_needs',
            'impact_assessment': 'user_needs',
            'solution_attempts': 'user_needs',
            'success_metrics': 'user_expectations',
            'cooperation_style': 'user_expectations',
            'timeline_expectations': 'user_expectations',
            'communication_preferences': 'user_expectations',
            'success_criteria': 'user_expectations',
            'context_clarification': 'user_questions',
            'next_steps_proposal': 'conversation_redirect',
            'deep_dive': 'user_questions',
            'implications': 'user_expectations',
            'action_items': 'conversation_redirect',

            // Training Flow mappings
            'concept_introduction': 'explain_concept',
            'detailed_explanation': 'explain_concept',
            'key_principles': 'theory_request',
            'theory_summary': 'summarize',
            'practice_design': 'show_me_how',
            'task_assignment': 'practice_alone',
            'guidance_provision': 'guide_me',
            'question_identification': 'ask_question',
            'understanding_check': 'check_understanding',
            'clarification_request': 'clarify',
            'exercise_creation': 'exercise',
            'solo_practice_setup': 'practice_alone',
            'self_attempt_support': 'try_myself',
            'knowledge_testing': 'test_me',
            'knowledge_verification': 'check_knowledge',
            'competency_assessment': 'assessment',
            'content_summarization': 'summarize',
            'learning_reflection': 'reflect',
            'achievement_review': 'what_learned',
            'progression_planning': 'what_next',
            'learning_continuation': 'continue_learning',
            'topic_transition': 'next_topic',
            'answer_formulation': 'ask_question',
            'assessment_preparation': 'assessment',
            'comprehension_check': 'check_understanding',
            'content_recap': 'summarize',
            'feedback_delivery': 'assessment',
            'feedback_loop': 'check_understanding',
            'key_insights': 'reflect',
            'knowledge_retrieval': 'ask_question',
            'practice_completion': 'practice_together',
            'practice_setup': 'practice_together',
            'progress_monitoring': 'assessment',
            'question_identification': 'ask_question',
            'reflection_questions': 'reflect',
            'resource_provision': 'continue_learning',
            'result_analysis': 'assessment',
            'result_evaluation': 'check_knowledge',
            'step_by_step_guidance': 'guide_me',
            'path_recommendation': 'next_topic',
            'resource_recommendation': 'next_topic',

            // Custom Avatar mappings
            'strategic_greeting': 'greeting',
            'vision_sharing': 'solution_presentation',
            'leadership_guidance': 'user_expectations',
            'business_networking': 'conversation_redirect'
        };

        // RAG USAGE INDICATORS (from query.controller.ts)
        const trainerRagIntents = ['theory_request', 'show_me_how', 'ask_question', 'practice_together', 'test_me', 'summarize_learning', 'what_next'];
        const networkerRagIntents = ['general_questions', 'solution_presentation'];
        
        // Get prompt for step
        const getPromptForStep = (step) => {
            if (!step || !step.id) return { template: null, intent: null, mappedIntent: 'unknown', usesRAG: false };
            
            let stepIntent = step.id;
            
            // Use smart mapping
            if (stepToIntentMap[step.id]) {
                stepIntent = stepToIntentMap[step.id];
            }
            
            const promptTemplate = Array.isArray(promptTemplates) ? 
                promptTemplates.find(t => t.intent === stepIntent) : null;
            const intentDefinition = Array.isArray(intentDefinitions) ? 
                intentDefinitions.find(i => i.name === stepIntent) : null;
            
            // Determine RAG usage
            const usesRAG = trainerRagIntents.includes(stepIntent) || networkerRagIntents.includes(stepIntent);
            
            return {
                template: promptTemplate,
                intent: intentDefinition,
                mappedIntent: stepIntent,
                usesRAG: usesRAG
            };
        };

        // Create ReactFlow nodes from flow definitions
        React.useEffect(() => {
            if (!flowDefinitions || flowDefinitions.length === 0) {
                setNodes([]);
                setEdges([]);
                return;
            }

            console.log('🔧 ZoomableFlowEditor: Creating nodes for', flowDefinitions.length, 'flows');

            const flowNodes = [];
            let yOffset = 0;

            flowDefinitions.forEach((flow, flowIndex) => {
                console.log(`🔧 Processing flow: ${flow.name} (${(flow.steps || []).length} steps)`);
                
                // Calculate flow width based on steps
                const stepsPerRow = Math.min((flow.steps || []).length, 5); // 5 steps per row for unified canvas
                const nodeWidth = 300;
                const nodeSpacing = 30;
                const isActiveFlow = activeFlow === flow.id;
                
                // Add flow header spacing
                if (flowIndex > 0) yOffset += 120; // Gap between flows
                
                // CREATE FLOW HEADER NODE
                const flowHeaderNode = {
                    id: `flow-header-${flow.id}`,
                    type: 'flowHeader',
                    position: { x: 20, y: yOffset },
                    data: {
                        flow: flow,
                        isActive: isActiveFlow,
                        title: flow.name,
                        stepCount: (flow.steps || []).length,
                        description: flow.description || ''
                    },
                    draggable: false,
                    selectable: false
                };
                flowNodes.push(flowHeaderNode);
                
                // Add spacing after header
                yOffset += 80;
                
                (flow.steps || []).forEach((step, stepIndex) => {
                    const promptData = getPromptForStep(step);
                    const isActive = activeFlow === flow.id && step.id === activeFlow;
                    
                    // Calculate position in unified canvas
                    const col = stepIndex % stepsPerRow;
                    const row = Math.floor(stepIndex / stepsPerRow);
                    const x = col * (nodeWidth + nodeSpacing) + 50; // 50px left margin
                    const y = yOffset + (row * 280) + 50; // Flow-specific Y offset + row spacing
                    
                    const node = {
                        id: `${flow.id}-${step.id}`,
                        type: 'cardNode', // Custom node type
                        position: { x, y },
                        data: {
                            // Step data
                            step: step,
                            flow: flow,
                            promptData: promptData,
                            isActive: isActive,
                            // Enhanced data
                            title: step.title || step.name || step.id,
                            description: step.description || '',
                            required: step.required || false,
                            next_steps: step.next_steps || [],
                            intent_name: promptData.mappedIntent,
                            intent_description: promptData.intent?.description || '',
                            has_template: !!promptData.template,
                            system_prompt: promptData.template?.system_prompt || '',
                            user_prompt_template: promptData.template?.user_prompt_template || '',
                            // 🔥 RAG INDICATOR!
                            usesRAG: promptData.usesRAG || false,
                            conditions: step.conditions || [],
                            memory_operation: step.memory_operation || '',
                            knowledge_source: step.knowledge_source || '',
                            vector_search: step.vector_search || false
                        },
                        draggable: editable
                    };
                    
                    flowNodes.push(node);
                });
                
                // Update yOffset for next flow
                const flowRows = Math.ceil((flow.steps || []).length / stepsPerRow);
                yOffset += (flowRows * 280) + 80; // Height of this flow + gap
            });

            console.log('🔧 ZoomableFlowEditor: Created', flowNodes.length, 'nodes');
            setNodes(flowNodes);
            setEdges([]); // No edges for now
        }, [flowDefinitions, promptTemplates, intentDefinitions, activeFlow]);

        // Node click handler
        const handleNodeClick = React.useCallback((event, node) => {
            console.log('🎯 ZoomableFlowEditor: Node clicked:', node.data.step, 'in flow:', node.data.flow.name);
            setSelectedNode(node.data);
            
            if (editable) {
                setShowNodeDialog(true);
            }
            
            onNodeClick({ step: node.data.step, flow: node.data.flow });
        }, [editable, onNodeClick]);

        // Define custom node types
        const nodeTypes = React.useMemo(() => ({
            // Flow Header Node Type
            flowHeader: ({ data }) => {
                const { flow, isActive, title, stepCount, description } = data;
                
                return React.createElement('div', {
                    style: {
                        padding: '12px 20px',
                        borderRadius: '8px',
                        backgroundColor: isActive ? '#22c55e' : '#374151',
                        color: 'white',
                        minWidth: '600px',
                        border: isActive ? '2px solid #16a34a' : '1px solid #4b5563',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                        userSelect: 'none',
                        pointerEvents: 'none'
                    }
                }, [
                    React.createElement('div', {
                        key: 'header-content',
                        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
                    }, [
                        React.createElement('div', {
                            key: 'left-content',
                            style: { display: 'flex', alignItems: 'center', gap: '12px' }
                        }, [
                            React.createElement('div', {
                                key: 'flow-dot',
                                style: {
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    backgroundColor: isActive ? '#ffffff' : '#9ca3af'
                                }
                            }),
                            React.createElement('h3', {
                                key: 'flow-title',
                                style: {
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    margin: 0
                                }
                            }, title),
                            React.createElement('span', {
                                key: 'step-count',
                                style: {
                                    fontSize: '14px',
                                    opacity: 0.8
                                }
                            }, `(${stepCount} steps)`)
                        ]),
                        
                        isActive && React.createElement('div', {
                            key: 'active-badge',
                            style: {
                                padding: '4px 12px',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }
                        }, 'ACTIVE FLOW')
                    ])
                ]);
            },
            
            // Card Node Type
            cardNode: ({ data, selected }) => {
                const { step, flow, promptData, isActive, usesRAG } = data;
                
                return React.createElement('div', {
                    style: {
                        padding: '12px 16px',
                        borderRadius: '12px',
                        backgroundColor: data.has_template ? '#1e40af' : '#dc2626',
                        color: 'white',
                        minWidth: '260px',
                        maxWidth: '280px',
                        minHeight: '200px', // ADDED: Ensure minimum height for content
                        border: selected || isActive ? '3px solid #22c55e' : '1px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        overflow: 'visible' // ADDED: Ensure content is visible
                    }
                }, [
                    // Header: Title + Status Badge
                    React.createElement('div', {
                        key: 'header',
                        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }
                    }, [
                        React.createElement('div', {
                            key: 'title',
                            style: { fontWeight: 'bold', fontSize: '14px' }
                        }, data.title),
                        
                        React.createElement('div', {
                            key: 'required-badge',
                            style: {
                                fontSize: '9px',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                backgroundColor: data.required ? '#16a34a' : '#6b7280',
                                color: 'white'
                            }
                        }, data.required ? 'REQ' : 'OPT')
                    ]),
                    
                    // Intent Info
                    React.createElement('div', {
                        key: 'intent-section',
                        style: { marginBottom: '8px' }
                    }, [
                        React.createElement('div', {
                            key: 'intent-name',
                            style: { fontSize: '11px', opacity: 0.9, fontWeight: '500' }
                        }, `Intent: ${data.intent_name}`),
                        
                        data.intent_description && React.createElement('div', {
                            key: 'intent-desc',
                            style: { fontSize: '9px', opacity: 0.7, marginTop: '2px' }
                        }, data.intent_description)
                    ]),
                    
                    // Prompt Info
                    React.createElement('div', {
                        key: 'prompt-section',
                        style: { marginBottom: '8px' }
                    }, [
                        React.createElement('div', {
                            key: 'template-status',
                            style: { 
                                fontSize: '10px', 
                                display: 'flex', 
                                alignItems: 'center',
                                gap: '4px',
                                flexWrap: 'wrap'
                            }
                        }, [
                            React.createElement('span', { key: 'icon' }, data.has_template ? '✅' : '❌'),
                            React.createElement('span', { key: 'text' }, data.has_template ? 'Template Ready' : 'No Template'),
                            // 🔥 RAG INDICATOR!
                            React.createElement('span', { 
                                key: 'rag-badge',
                                style: {
                                    marginLeft: '8px',
                                    padding: '2px 4px',
                                    borderRadius: '3px',
                                    fontSize: '9px',
                                    backgroundColor: usesRAG ? '#3b82f6' : '#6b7280',
                                    color: 'white',
                                    fontWeight: 'bold'
                                }
                            }, usesRAG ? 'RAG🧠' : 'NO-RAG')
                        ]),
                        
                        data.has_template && data.system_prompt && React.createElement('div', {
                            key: 'system-prompt',
                            style: { 
                                fontSize: '9px', 
                                opacity: 0.8, 
                                marginTop: '4px',
                                maxHeight: '30px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }
                        }, `System: ${data.system_prompt.substring(0, 60)}...`)
                    ]),
                    
                    // Advanced info (conditions, memory, etc.)
                    (data.conditions?.length > 0 || data.memory_operation || data.knowledge_source || data.vector_search) && React.createElement('div', {
                        key: 'advanced-section',
                        style: { 
                            fontSize: '9px', 
                            opacity: 0.7,
                            borderTop: '1px solid rgba(255,255,255,0.2)',
                            paddingTop: '6px',
                            marginTop: '6px'
                        }
                    }, [
                        data.conditions?.length > 0 && React.createElement('div', { key: 'cond' }, `Conditions: ${data.conditions.length}`),
                        data.memory_operation && React.createElement('div', { key: 'mem' }, `Memory: ${data.memory_operation}`),
                        data.knowledge_source && React.createElement('div', { key: 'know' }, `Knowledge: ${data.knowledge_source}`),
                        data.vector_search && React.createElement('div', { key: 'vec', style: { color: '#fbbf24' } }, '🔍 Vector Search')
                    ]),
                    
                    // Next steps
                    data.next_steps?.length > 0 && React.createElement('div', {
                        key: 'next-steps',
                        style: { 
                            fontSize: '9px', 
                            opacity: 0.8,
                            borderTop: '1px solid rgba(255,255,255,0.2)',
                            paddingTop: '6px',
                            marginTop: '6px'
                        }
                    }, `Next: ${data.next_steps.join(', ')}`)
                ]);
            }
        }), []);

        return React.createElement('div', {
            style: { 
                width: '100%', 
                height: '600px',
                display: 'flex'
            }
        }, [
            // Left sidebar: Flow indicators
            React.createElement('div', {
                key: 'flow-indicators',
                style: {
                    width: '250px',
                    backgroundColor: '#1f2937',
                    padding: '16px',
                    borderRadius: '8px 0 0 8px',
                    overflowY: 'auto'
                }
            }, [
                React.createElement('h3', {
                    key: 'sidebar-title',
                    style: { color: '#ffffff', marginBottom: '16px', fontSize: '16px' }
                }, 'Flow Overview'),
                
                ...flowDefinitions.map((flow, flowIndex) => {
                    const isActiveFlow = activeFlow === flow.id;
                    return React.createElement('div', {
                        key: flow.id,
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '8px 12px',
                            marginBottom: '8px',
                            borderRadius: '8px',
                            backgroundColor: isActiveFlow ? '#22c55e20' : '#374151',
                            border: isActiveFlow ? '2px solid #22c55e' : '1px solid #4b5563',
                            cursor: 'pointer'
                        }
                    }, [
                        // Flow indicator dot
                        React.createElement('div', {
                            key: 'dot',
                            style: {
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: isActiveFlow ? '#22c55e' : '#6b7280'
                            }
                        }),
                        
                        // Flow name and info
                        React.createElement('div', {
                            key: 'info',
                            style: { flex: 1 }
                        }, [
                            React.createElement('div', {
                                key: 'name',
                                style: {
                                    color: isActiveFlow ? '#22c55e' : '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: 'bold'
                                }
                            }, flow.name),
                            React.createElement('div', {
                                key: 'count',
                                style: {
                                    color: '#9ca3af',
                                    fontSize: '11px'
                                }
                            }, `${(flow.steps || []).length} steps`)
                        ])
                    ]);
                })
            ]),
            
            // Main canvas: Single ReactFlow with all nodes
            React.createElement('div', {
                key: 'main-canvas',
                style: {
                    flex: 1,
                    backgroundColor: '#0d1117',
                    borderRadius: '0 8px 8px 0'
                }
            }, React.createElement(window.ReactFlow.default, {
                key: 'unified-reactflow',
                nodes: nodes,
                edges: [], // No edges for now
                onNodesChange: onNodesChange,
                onEdgesChange: onEdgesChange,
                onNodeClick: handleNodeClick,
                nodeTypes: nodeTypes, // Updated to use nodeTypes instead of cardNodeType
                fitView: true,
                fitViewOptions: { padding: 0.1 },
                minZoom: 0.1,
                maxZoom: 2,
                defaultViewport: { x: 0, y: 0, zoom: 0.6 },
                style: { backgroundColor: '#0d1117' },
                panOnDrag: true,
                zoomOnScroll: true,
                zoomOnDoubleClick: true
            })),
            
            // Enhanced dialog (same as FlowCardEditor)
            showNodeDialog && selectedNode && React.createElement('div', {
                key: 'dialog-overlay',
                style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                },
                onClick: () => setShowNodeDialog(false)
            }, [
                React.createElement('div', {
                    key: 'dialog',
                    style: {
                        backgroundColor: '#1f2937',
                        padding: '24px',
                        borderRadius: '12px',
                        maxWidth: '700px',
                        maxHeight: '80vh',
                        color: 'white',
                        overflow: 'auto'
                    },
                    onClick: (e) => e.stopPropagation()
                }, [
                    React.createElement('h3', { 
                        key: 'title',
                        style: { marginBottom: '16px', color: '#22c55e' }
                    }, `Node Details: ${selectedNode.title}`),
                    
                    // Flow Info
                    React.createElement('div', {
                        key: 'flow-info',
                        style: { marginBottom: '16px', padding: '12px', backgroundColor: '#374151', borderRadius: '8px' }
                    }, [
                        React.createElement('h4', { key: 'flow-title', style: { color: '#60a5fa', marginBottom: '8px' } }, 'Flow Information'),
                        React.createElement('p', { key: 'flow-name' }, `Flow: ${selectedNode.flow.name}`),
                        React.createElement('p', { key: 'flow-id' }, `Flow ID: ${selectedNode.flow.id}`)
                    ]),
                    
                    // Step Properties
                    React.createElement('div', {
                        key: 'step-props',
                        style: { marginBottom: '16px', padding: '12px', backgroundColor: '#374151', borderRadius: '8px' }
                    }, [
                        React.createElement('h4', { key: 'step-title', style: { color: '#60a5fa', marginBottom: '8px' } }, 'Step Properties'),
                        React.createElement('p', { key: 'id' }, `ID: ${selectedNode.step.id}`),
                        React.createElement('p', { key: 'desc' }, `Description: ${selectedNode.description || 'No description'}`),
                        React.createElement('p', { key: 'req' }, `Required: ${selectedNode.required ? 'Yes' : 'No'}`),
                        selectedNode.next_steps?.length > 0 && React.createElement('p', { key: 'next' }, `Next Steps: ${selectedNode.next_steps.join(', ')}`),
                        selectedNode.conditions?.length > 0 && React.createElement('p', { key: 'cond' }, `Conditions: ${selectedNode.conditions.length} defined`),
                        selectedNode.memory_operation && React.createElement('p', { key: 'mem' }, `Memory Operation: ${selectedNode.memory_operation}`),
                        selectedNode.knowledge_source && React.createElement('p', { key: 'know' }, `Knowledge Source: ${selectedNode.knowledge_source}`),
                        selectedNode.vector_search && React.createElement('p', { key: 'vec' }, 'Vector Search: Enabled')
                    ]),
                    
                    // Intent Info
                    React.createElement('div', {
                        key: 'intent-info',
                        style: { marginBottom: '16px', padding: '12px', backgroundColor: '#374151', borderRadius: '8px' }
                    }, [
                        React.createElement('h4', { key: 'intent-title', style: { color: '#60a5fa', marginBottom: '8px' } }, 'Intent Information'),
                        React.createElement('p', { key: 'intent-mapped' }, `Mapped Intent: ${selectedNode.intent_name}`),
                        selectedNode.intent_description && React.createElement('p', { key: 'intent-desc' }, `Description: ${selectedNode.intent_description}`)
                    ]),
                    
                    // Prompt Template Info
                    selectedNode.has_template && React.createElement('div', {
                        key: 'prompt-info',
                        style: { marginBottom: '16px', padding: '12px', backgroundColor: '#374151', borderRadius: '8px' }
                    }, [
                        React.createElement('h4', { key: 'prompt-title', style: { color: '#60a5fa', marginBottom: '8px' } }, 'Prompt Template'),
                        React.createElement('div', { key: 'sys-prompt', style: { marginBottom: '8px' } }, [
                            React.createElement('strong', { key: 'sys-label' }, 'System Prompt: '),
                            React.createElement('pre', { 
                                key: 'sys-text',
                                style: { 
                                    fontSize: '11px', 
                                    backgroundColor: '#111827', 
                                    padding: '8px', 
                                    borderRadius: '4px',
                                    whiteSpace: 'pre-wrap',
                                    maxHeight: '120px',
                                    overflow: 'auto'
                                }
                            }, selectedNode.system_prompt || 'No system prompt')
                        ]),
                        React.createElement('div', { key: 'user-prompt', style: { marginBottom: '8px' } }, [
                            React.createElement('strong', { key: 'user-label' }, 'User Prompt Template: '),
                            React.createElement('pre', { 
                                key: 'user-text',
                                style: { 
                                    fontSize: '11px', 
                                    backgroundColor: '#111827', 
                                    padding: '8px', 
                                    borderRadius: '4px',
                                    whiteSpace: 'pre-wrap',
                                    maxHeight: '100px',
                                    overflow: 'auto'
                                }
                            }, selectedNode.user_prompt_template || 'No user prompt template')
                        ])
                    ]),
                    React.createElement('button', {
                        key: 'close',
                        onClick: () => setShowNodeDialog(false),
                        style: {
                            marginTop: '16px',
                            padding: '10px 20px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }
                    }, 'Close')
                ])
            ])
        ]);
    };

    // Export the component
    window.ZoomableFlowEditor = ZoomableFlowEditor;
