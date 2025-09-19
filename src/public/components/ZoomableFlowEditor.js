// ZoomableFlowEditor - ReactFlow container + custom card nodes (bez edges)
const ZoomableFlowEditor = ({
                                flowDefinitions = [], activeFlow = null, currentStep = null, onNodeClick = () => {
    }, editable = false, avatar = null
                            }) => {
    const [nodes, setNodes, onNodesChange] = window.ReactFlow.useNodesState([]);
    const [edges, setEdges, onEdgesChange] = window.ReactFlow.useEdgesState([]);
    const [selectedNode, setSelectedNode] = React.useState(null);
    const [showNodeDialog, setShowNodeDialog] = React.useState(false);

    // Get prompt templates and intent definitions
    const [promptTemplates, setPromptTemplates] = React.useState([]);
    const [intentDefinitions, setIntentDefinitions] = React.useState([]);
    const reactFlowInstance = React.useRef(null);
    const previousCurrentStep = React.useRef(null);

    React.useEffect(() => {
        Promise.all([
            fetch('/api/prompt-templates').then(res => res.json()),
            fetch('/api/intent-definitions').then(res => res.json())
        ]).then(([templatesResponse, intentsResponse]) => {
            console.log('📥 API Response - Templates:', templatesResponse);
            console.log('📥 API Response - Intents:', intentsResponse);
            setPromptTemplates(templatesResponse.templates || templatesResponse);
            setIntentDefinitions(intentsResponse.intents || intentsResponse);
        }).catch(error => {
            console.error('❌ Error fetching templates or intents:', error);
        });
    }, []);

    // Hardcoded list of intents that use RAG for each avatar type
    const trainerRagIntents = ['theory_request', 'show_me_how', 'ask_question', 'practice_together', 'test_me', 'summarize_learning', 'what_next'];
    const networkerRagIntents = ['general_questions', 'solution_presentation'];

    // Get prompt template and intent definition for a flow step
    const getPromptForStep = (step, flow) => {
        console.log('🔍 [getPromptForStep] Looking for step:', step, 'in flow:', flow.name);

        if (!promptTemplates.length || !intentDefinitions.length) {
            console.log('⚠️ Templates or intents not loaded yet');
            return {template: null, intent: null, mappedIntent: 'loading...', usesRAG: false};
        }

        // Smart mapping: Use flow entry_intents to determine RAG usage
        let stepIntent = step.intent_name;
        let flowUsesRAG = false;

        // Check if flow entry_intents include RAG intents
        if (flow.entry_intents && flow.entry_intents.length > 0) {
            flowUsesRAG = flow.entry_intents.some(intent =>
                trainerRagIntents.includes(intent) || networkerRagIntents.includes(intent)
            );
            // Use first entry_intent as primary intent for templates
            stepIntent = stepIntent || flow.entry_intents[0];
            console.log(`🎯 [FLOW RAG] ${flow.name} → entry_intents: ${flow.entry_intents.join(', ')} → RAG: ${flowUsesRAG}`);
        }

        if (!stepIntent) {
            // Fallback mapping based on step.id patterns
            const stepId = step.id;
            if (stepId.includes('greeting')) stepIntent = 'greeting';
            else if (stepId.includes('company_questions') || stepId.includes('general')) stepIntent = 'general_questions';
            else if (stepId.includes('solution_presentation') || stepId.includes('solution')) stepIntent = 'solution_presentation';
            else if (stepId.includes('expectation_management')) stepIntent = 'user_expectations';
            else if (stepId.includes('conversation_redirect')) stepIntent = 'conversation_redirect';
            else if (stepId.includes('offer_assessment')) stepIntent = 'offer_assessment';
            else if (stepId.includes('cooperation_closing')) stepIntent = 'cooperation_closing';
            else if (stepId.includes('offer_questions')) stepIntent = 'offer_questions';
            else if (stepId.includes('cooperation_decision')) stepIntent = 'cooperation_decision';
            else if (stepId.includes('interest_in_user_offer')) stepIntent = 'interest_in_user_offer';
            // Training-specific mappings
            else if (stepId.includes('theory') || stepId.includes('concept')) stepIntent = 'theory_request';
            else if (stepId.includes('show') || stepId.includes('example')) stepIntent = 'show_me_how';
            else if (stepId.includes('question')) stepIntent = 'ask_question';
            else if (stepId.includes('practice')) stepIntent = 'practice_together';
            else if (stepId.includes('test')) stepIntent = 'test_me';
            else if (stepId.includes('summary')) stepIntent = 'summarize_learning';
            else if (stepId.includes('next')) stepIntent = 'what_next';
            else stepIntent = stepId; // fallback to step.id

            console.log(`🎯 [STEP MAPPING] ${stepId} → ${stepIntent}`);
        }

        // Try exact match first, then with _template suffix
        let promptTemplate = promptTemplates.find(t => t.id === stepIntent);
        if (!promptTemplate) {
            promptTemplate = promptTemplates.find(t => t.id === `${stepIntent}_template`);
        }

        // For intent definitions, try both with and without suffix
        let intentDefinition = intentDefinitions.find(i => i.id === stepIntent);
        if (!intentDefinition) {
            intentDefinition = intentDefinitions.find(i => i.name === stepIntent);
        }

        // 🔥 FOR CUSTOM AVATARS: Use avatar's own intents first!
        if (!intentDefinition && avatar && avatar.intents) {
            intentDefinition = avatar.intents.find(i => i.name === stepIntent);
            console.log(`🎯 [CUSTOM INTENT] Found "${stepIntent}" in avatar intents:`, intentDefinition);
        }

        // Use flow-level RAG detection or intent-level fallback
        const usesRAG = flowUsesRAG || trainerRagIntents.includes(stepIntent) || networkerRagIntents.includes(stepIntent);

        console.log('📝 [getPromptForStep] Found:', {
            stepIntent,
            hasTemplate: !!promptTemplate,
            templateId: promptTemplate?.id || 'none',
            hasIntent: !!intentDefinition,
            intentId: intentDefinition?.id || intentDefinition?.name || 'none',
            flowUsesRAG: flowUsesRAG,
            usesRAG: usesRAG
        });

        return {
            template: promptTemplate,
            intent: intentDefinition,
            mappedIntent: stepIntent,
            usesRAG: usesRAG
        };
    };

    // Handle node click
    const handleNodeClick = React.useCallback((event, node) => {
        console.log('🎯 Node clicked:', node);
        setSelectedNode(node.data);
        setShowNodeDialog(true);
        if (onNodeClick) onNodeClick(node.data);
    }, [onNodeClick]);

    // Generate nodes for ReactFlow
    React.useEffect(() => {
        if (!flowDefinitions.length) {
            console.log('⚠️ No flow definitions available');
            setNodes([]);
            return;
        }

        console.log('🔥 [ZoomableFlowEditor] Processing flows:', flowDefinitions.length);
        console.log('🎯 [CURRENT STEP]:', currentStep);

        const flowNodes = [];
        let yOffset = 20;

        flowDefinitions.forEach((flow, flowIndex) => {
            const isActiveFlow = activeFlow === flow.id;

            console.log(`📋 Processing flow: ${flow.name} (${flow.id}) - Active: ${isActiveFlow}`);

            // CREATE FLOW HEADER NODE
            const flowHeaderNode = {
                id: `flow-header-${flow.id}`,
                type: 'flowHeader',
                position: {x: 20, y: yOffset},
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
            yOffset += 80; // Add spacing after header

            // CREATE STEP NODES (oryginalny layout dashboardu – użyj yOffset i układu zgodnego z poprzednią wersją)
            const steps = flow.steps || [];
            let xOffset = 20;

            steps.forEach((step, stepIndex) => {
                const promptData = getPromptForStep(step, flow); // Pass flow object
                const nodeId = `${flow.id}-${step.id}`;
                const isCurrentStep = currentStep === step.id; // Check if this is the current step

                const node = {
                    id: nodeId,
                    type: 'cardNode',
                    position: {x: xOffset, y: yOffset},
                    data: {
                        step: step,
                        flow: flow,
                        promptData: promptData,
                        isActive: isActiveFlow,
                        isCurrentStep: isCurrentStep, // 🎯 CURRENT STEP INDICATOR!
                        usesRAG: promptData.usesRAG || false, // 🔥 RAG INDICATOR!

                        // Enhanced data for dialog
                        title: step.title || step.name || step.id,
                        description: step.description || '',
                        required: step.required || false,
                        next_steps: step.next_steps || [],
                        intent_name: promptData.mappedIntent,
                        intent_description: promptData.intent?.description || '',
                        has_template: !!promptData.template,
                        system_prompt: promptData.template?.system_prompt || promptData.intent?.system_prompt || '',
                        user_prompt_template: promptData.template?.user_prompt_template || promptData.intent?.user_prompt_template || '',
                        // Additional properties from working commit
                        conditions: step.conditions || [],
                        memory_operation: step.memory_operation || '',
                        knowledge_source: step.knowledge_source || '',
                        vector_search: step.vector_search || false,
                        // Store complete promptData for debugging
                        promptData: promptData
                    },
                    draggable: true,
                    selectable: true
                };

                flowNodes.push(node);
                xOffset += 280; // 260px width + 20px gap
            });

            yOffset += 200; // powrót do oryginalnego odstępu dashboardu
        });

        console.log(`✅ [ZoomableFlowEditor] Generated ${flowNodes.length} nodes for ReactFlow`);
        setNodes(flowNodes);

        // Auto-focus after nodes are set (if currentStep changed)
        if (currentStep && reactFlowInstance.current && previousCurrentStep.current !== currentStep) {
            console.log('🎯 [AUTO-FOCUS CALLBACK] Current step CHANGED, searching in new nodes...');

            // Find current step node in the NEW flowNodes array
            const currentStepNode = flowNodes.find(node =>
                node.data && node.data.isCurrentStep === true
            );

            if (currentStepNode) {
                console.log('🎯 [AUTO-FOCUS CALLBACK] Found FRESH current step node:', currentStepNode.id, 'at position:', currentStepNode.position);

                // Update previous step reference
                previousCurrentStep.current = currentStep;

                // Center view on the current step node with less aggressive zoom
                setTimeout(() => {
                    reactFlowInstance.current?.fitView({
                        nodes: [currentStepNode],
                        duration: 800,
                        padding: 0.6
                    });
                }, 300); // Shorter delay since nodes are fresh
            } else {
                console.log('⚠️ [AUTO-FOCUS CALLBACK] FRESH current step node not found. Available nodes:', flowNodes.map(n => ({
                    id: n.id,
                    isCurrentStep: n.data?.isCurrentStep,
                    stepId: n.data?.step?.id
                })));
            }
        }

    }, [flowDefinitions, activeFlow, promptTemplates, intentDefinitions, currentStep]);

    // Custom node types
    const nodeTypes = React.useMemo(() => ({
        flowHeader: ({data}) => {
            const {flow, isActive, title, stepCount, description} = data;
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
                    style: {display: 'flex', alignItems: 'center', gap: '12px'}
                }, [
                    React.createElement('div', {
                        key: 'dot',
                        style: {
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: isActive ? '#16a34a' : '#6b7280'
                        }
                    }),
                    React.createElement('h3', {
                        key: 'title',
                        style: {margin: 0, fontSize: '16px', fontWeight: 'bold'}
                    }, title),
                    React.createElement('span', {
                        key: 'count',
                        style: {
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            fontSize: '12px'
                        }
                    }, `${stepCount} steps`),
                    isActive && React.createElement('span', {
                        key: 'active-badge',
                        style: {
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#16a34a',
                            fontSize: '12px',
                            fontWeight: 'bold'
                        }
                    }, 'ACTIVE')
                ])
            ]);
        },
        cardNode: ({data, selected}) => {
            const {step, flow, promptData, isActive, isCurrentStep, usesRAG} = data; // Destructure isCurrentStep + usesRAG
            return React.createElement('div', {
                style: {
                    width: '260px',
                    minHeight: '120px',
                    backgroundColor: isCurrentStep ? '#16a34a' : (isActive ? '#1e3a8a' : '#1f2937'), // Green for current step
                    border: selected ? '2px solid #3b82f6' : (isCurrentStep ? '3px solid #22c55e' : (isActive ? '2px solid #1e40af' : '1px solid #374151')),
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    boxShadow: selected ? '0 0 0 3px rgba(59, 130, 246, 0.5)' : (isCurrentStep ? '0 0 0 3px rgba(34, 197, 94, 0.5)' : '0 2px 4px rgba(0,0,0,0.3)'),
                    transition: 'all 0.2s ease'
                }
            }, [
                React.createElement('div', {
                    key: 'header',
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                    }
                }, [
                    React.createElement('h4', {
                        key: 'title',
                        style: {
                            color: isActive ? '#dbeafe' : '#ffffff',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            margin: 0,
                            flex: 1
                        }
                    }, step.name || step.id),
                    React.createElement('span', {
                        key: 'required-badge',
                        style: {
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            backgroundColor: step.required ? '#dc2626' : '#6b7280',
                            color: 'white',
                            fontWeight: 'bold'
                        }
                    }, step.required ? 'REQ' : 'OPT'),
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
                    }, usesRAG ? 'RAG🧠' : 'NO-RAG'),

                    isCurrentStep && React.createElement('span', {
                        key: 'current-badge',
                        style: {
                            marginLeft: '8px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            backgroundColor: '#16a34a',
                            color: 'white',
                            fontWeight: 'bold',
                            border: '1px solid #ffffff'
                        }
                    }, '✅ CURRENT')
                ]),
                React.createElement('p', {
                    key: 'description',
                    style: {
                        color: isActive ? '#93c5fd' : '#d1d5db',
                        fontSize: '12px',
                        margin: '8px 0',
                        lineHeight: '1.4'
                    }
                }, step.description || 'No description'),
                React.createElement('div', {
                    key: 'intent',
                    style: {marginTop: '8px'}
                }, [
                    React.createElement('span', {
                        key: 'intent-label',
                        style: {
                            color: isActive ? '#60a5fa' : '#9ca3af',
                            fontSize: '11px',
                            fontWeight: 'bold'
                        }
                    }, 'Intent: '),
                    React.createElement('span', {
                        key: 'intent-value',
                        style: {
                            color: isActive ? '#dbeafe' : '#e5e7eb',
                            fontSize: '11px'
                        }
                    }, promptData?.mappedIntent || 'none')
                ])
            ]);
        }
    }), []);

    return React.createElement('div', {
        style: {
            width: '100%',
            height: '600px'
        }
    }, [
        // Clean ReactFlow canvas
        React.createElement('div', {
            key: 'main-canvas',
            style: {
                width: '100%',
                height: '100%',
                backgroundColor: '#0d1117',
                borderRadius: '8px'
            }
        }, React.createElement(window.ReactFlow.default, {
            key: 'unified-reactflow',
            nodes: nodes,
            edges: [], // No edges for now
            onNodesChange: onNodesChange,
            onEdgesChange: onEdgesChange,
            onNodeClick: handleNodeClick,
            nodeTypes: nodeTypes,
            onInit: (reactFlowInstanceParam) => {
                reactFlowInstance.current = reactFlowInstanceParam;
                console.log('🎯 [REACTFLOW] Instance initialized for auto-focus');
            },
            fitView: false, // przywrócone do dashboardowego defaultu
            minZoom: 0.1,
            maxZoom: 3,
            defaultViewport: {x: 0, y: 0, zoom: 1.3}, // oryginalny zoom
            style: {backgroundColor: '#0d1117'},
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
                zIndex: 9999
            },
            onClick: (e) => {
                if (e.target === e.currentTarget) {
                    setShowNodeDialog(false);
                    setSelectedNode(null);
                }
            }
        }, [
            React.createElement('div', {
                key: 'dialog-content',
                style: {
                    backgroundColor: '#1f2937',
                    padding: '24px',
                    borderRadius: '12px',
                    maxWidth: '900px',
                    maxHeight: '85vh',
                    color: 'white',
                    overflow: 'auto'
                },
                onClick: (e) => e.stopPropagation()
            }, [
                // Header with close button
                React.createElement('div', {
                    key: 'dialog-header',
                    style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px'
                    }
                }, [
                    React.createElement('h3', {
                        key: 'title',
                        style: {marginBottom: 0, color: '#22c55e', fontSize: '20px'}
                    }, `Node Details: ${selectedNode?.title || selectedNode?.step?.name || 'Unknown'}`),

                    React.createElement('button', {
                        key: 'close',
                        onClick: () => {
                            setShowNodeDialog(false);
                            setSelectedNode(null);
                        },
                        style: {
                            background: 'none',
                            border: 'none',
                            color: '#8b949e',
                            fontSize: '24px',
                            cursor: 'pointer',
                            padding: '4px'
                        }
                    }, '✕')
                ]),

                // Flow Info
                React.createElement('div', {
                    key: 'flow-info',
                    style: {marginBottom: '16px', padding: '12px', backgroundColor: '#374151', borderRadius: '8px'}
                }, [
                    React.createElement('h4', {
                        key: 'flow-title',
                        style: {color: '#60a5fa', marginBottom: '8px'}
                    }, 'Flow Information'),
                    React.createElement('p', {
                        key: 'flow-name',
                        style: {margin: '4px 0', color: '#e5e7eb'}
                    }, `Flow: ${selectedNode?.flow?.name || 'Unknown'}`),
                    React.createElement('p', {
                        key: 'flow-id',
                        style: {margin: '4px 0', color: '#9ca3af'}
                    }, `Flow ID: ${selectedNode?.flow?.id || 'Unknown'}`),
                    selectedNode?.flow?.description && React.createElement('p', {
                        key: 'flow-desc',
                        style: {margin: '4px 0', color: '#d1d5db', fontSize: '14px'}
                    }, selectedNode.flow.description)
                ]),

                // Step Properties
                React.createElement('div', {
                    key: 'step-props',
                    style: {marginBottom: '16px', padding: '12px', backgroundColor: '#374151', borderRadius: '8px'}
                }, [
                    React.createElement('h4', {
                        key: 'step-title',
                        style: {color: '#60a5fa', marginBottom: '8px'}
                    }, 'Step Properties'),
                    React.createElement('p', {
                        key: 'id',
                        style: {margin: '4px 0', color: '#e5e7eb'}
                    }, `ID: ${selectedNode?.step?.id || 'Unknown'}`),
                    React.createElement('p', {
                        key: 'desc',
                        style: {margin: '4px 0', color: '#d1d5db'}
                    }, `Description: ${selectedNode?.description || 'No description'}`),
                    React.createElement('p', {
                        key: 'req',
                        style: {margin: '4px 0', color: selectedNode?.required ? '#22c55e' : '#ef4444'}
                    }, `Required: ${selectedNode?.required ? 'Yes' : 'No'}`),
                    selectedNode?.next_steps?.length > 0 && React.createElement('p', {
                        key: 'next',
                        style: {margin: '4px 0', color: '#93c5fd'}
                    }, `Next Steps: ${selectedNode.next_steps.join(', ')}`),
                    selectedNode?.step?.conditions?.length > 0 && React.createElement('p', {
                        key: 'cond',
                        style: {margin: '4px 0', color: '#fbbf24'}
                    }, `Conditions: ${selectedNode.step.conditions.length} defined`),
                    selectedNode?.step?.memory_operation && React.createElement('p', {
                        key: 'mem',
                        style: {margin: '4px 0', color: '#a78bfa'}
                    }, `Memory Operation: ${selectedNode.step.memory_operation}`),
                    selectedNode?.step?.knowledge_source && React.createElement('p', {
                        key: 'know',
                        style: {margin: '4px 0', color: '#34d399'}
                    }, `Knowledge Source: ${selectedNode.step.knowledge_source}`),
                    selectedNode?.step?.vector_search && React.createElement('p', {
                        key: 'vec',
                        style: {margin: '4px 0', color: '#06b6d4'}
                    }, 'Vector Search: Enabled')
                ]),

                // Intent Info
                React.createElement('div', {
                    key: 'intent-info',
                    style: {marginBottom: '16px', padding: '12px', backgroundColor: '#374151', borderRadius: '8px'}
                }, [
                    React.createElement('h4', {
                        key: 'intent-title',
                        style: {color: '#60a5fa', marginBottom: '8px'}
                    }, 'Intent Information'),
                    React.createElement('p', {
                        key: 'intent-mapped',
                        style: {margin: '4px 0', color: '#e5e7eb'}
                    }, `Mapped Intent: ${selectedNode?.intent_name || 'None'}`),
                    selectedNode?.intent_description && React.createElement('p', {
                        key: 'intent-desc',
                        style: {margin: '4px 0', color: '#d1d5db', fontSize: '14px'}
                    }, `Description: ${selectedNode.intent_description}`)
                ]),

                // RAG Indicator
                React.createElement('div', {
                    key: 'rag-info',
                    style: {
                        marginBottom: '16px',
                        padding: '12px',
                        backgroundColor: selectedNode?.usesRAG ? '#1e3a8a' : '#374151',
                        borderRadius: '8px'
                    }
                }, [
                    React.createElement('h4', {
                        key: 'rag-title',
                        style: {color: '#60a5fa', marginBottom: '8px'}
                    }, 'Knowledge Base (RAG)'),
                    React.createElement('div', {
                        key: 'rag-status',
                        style: {display: 'flex', alignItems: 'center', gap: '8px'}
                    }, [
                        React.createElement('span', {
                            key: 'rag-icon',
                            style: {fontSize: '18px'}
                        }, selectedNode?.usesRAG ? '🧠' : '🚫'),
                        React.createElement('span', {key: 'rag-text', style: {color: '#e6edf3', fontWeight: 'bold'}},
                            selectedNode?.usesRAG ? 'Uses RAG Knowledge Base' : 'No RAG Integration'),
                        React.createElement('span', {
                            key: 'rag-badge',
                            style: {
                                marginLeft: '8px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                backgroundColor: selectedNode?.usesRAG ? '#3b82f6' : '#6b7280',
                                color: 'white',
                                fontWeight: 'bold'
                            }
                        }, selectedNode?.usesRAG ? 'RAG🧠' : 'NO-RAG')
                    ])
                ]),

                // Prompt Template Info (ALWAYS SHOW FOR DEBUG)
                React.createElement('div', {
                    key: 'prompt-info',
                    style: {marginBottom: '16px', padding: '12px', backgroundColor: '#374151', borderRadius: '8px'}
                }, [
                    React.createElement('h4', {key: 'prompt-title', style: {color: '#60a5fa', marginBottom: '8px'}},
                        `Prompt Template (has_template: ${selectedNode?.has_template}, template: ${!!selectedNode?.promptData?.template})`),

                    // Debug info
                    React.createElement('div', {
                            key: 'debug-info',
                            style: {marginBottom: '8px', fontSize: '10px', color: '#fbbf24'}
                        },
                        `Debug: mappedIntent="${selectedNode?.intent_name}", templates loaded: ${promptTemplates.length}, intents loaded: ${intentDefinitions.length}`),

                    React.createElement('div', {
                            key: 'debug-prompts',
                            style: {marginBottom: '8px', fontSize: '10px', color: '#06b6d4'}
                        },
                        `Prompt Debug: system_prompt length: ${(selectedNode?.system_prompt || '').length}, user_prompt length: ${(selectedNode?.user_prompt_template || '').length}`),

                    React.createElement('div', {
                            key: 'debug-template',
                            style: {marginBottom: '8px', fontSize: '10px', color: '#ec4899'}
                        },
                        `Template Debug: template found: ${!!selectedNode?.promptData?.template}, template id: ${selectedNode?.promptData?.template?.id || 'none'}`),
                    React.createElement('div', {key: 'sys-prompt', style: {marginBottom: '12px'}}, [
                        React.createElement('strong', {key: 'sys-label', style: {color: '#fbbf24'}}, 'System Prompt: '),
                        React.createElement('pre', {
                            key: 'sys-text',
                            style: {
                                fontSize: '11px',
                                backgroundColor: '#111827',
                                padding: '12px',
                                borderRadius: '6px',
                                whiteSpace: 'pre-wrap',
                                maxHeight: '150px',
                                overflow: 'auto',
                                color: '#d1d5db',
                                border: '1px solid #374151',
                                marginTop: '4px'
                            }
                        }, selectedNode?.system_prompt || 'No system prompt')
                    ]),
                    React.createElement('div', {key: 'user-prompt', style: {marginBottom: '8px'}}, [
                        React.createElement('strong', {
                            key: 'user-label',
                            style: {color: '#34d399'}
                        }, 'User Prompt Template: '),
                        React.createElement('pre', {
                            key: 'user-text',
                            style: {
                                fontSize: '11px',
                                backgroundColor: '#111827',
                                padding: '12px',
                                borderRadius: '6px',
                                whiteSpace: 'pre-wrap',
                                maxHeight: '150px',
                                overflow: 'auto',
                                color: '#d1d5db',
                                border: '1px solid #374151',
                                marginTop: '4px'
                            }
                        }, selectedNode?.user_prompt_template || 'No user prompt template')
                    ])
                ])
            ])
        ])
    ]);
};

// Export the component
window.ZoomableFlowEditor = ZoomableFlowEditor;