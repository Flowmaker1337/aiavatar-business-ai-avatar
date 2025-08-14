    // FlowCardEditor - NOWY APPROACH: Card wrapper per flow + ReactFlow nodes
    const FlowCardEditor = ({ flowDefinitions = [], activeFlow = null, onNodeClick = () => {}, editable = false }) => {
        const [selectedNode, setSelectedNode] = React.useState(null);
        const [showNodeDialog, setShowNodeDialog] = React.useState(false);
        const [editingNode, setEditingNode] = React.useState(null);

        // Get prompt templates and intent definitions  
        const [promptTemplates, setPromptTemplates] = React.useState([]);
        const [intentDefinitions, setIntentDefinitions] = React.useState([]);

        React.useEffect(() => {
            // Load templates
            fetch('/api/prompt-templates')
                .then(response => response.json())
                .then(data => {
                    console.log('🔧 FlowCardEditor: Raw prompt templates response:', data);
                    const templates = Array.isArray(data) ? data : (data?.templates || []);
                    console.log('🔧 FlowCardEditor: Loaded prompt templates:', templates.length);
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
                    console.log('🔧 FlowCardEditor: Raw intent definitions response:', data);
                    const definitions = Array.isArray(data) ? data : (data?.definitions || []);
                    console.log('🔧 FlowCardEditor: Loaded intent definitions:', definitions.length);
                    setIntentDefinitions(definitions);
                })
                .catch(error => {
                    console.error('Failed to load intent definitions:', error);
                    setIntentDefinitions([]);
                });
        }, []);

        // Node click handler
        const handleNodeClick = React.useCallback((step, flow) => {
            console.log('🎯 FlowCardEditor: Node clicked:', step, 'in flow:', flow.name);
            setSelectedNode({ step, flow });
            
            if (editable) {
                setEditingNode({
                    id: step.id,
                    title: step.name || step.id,
                    description: step.description || '',
                    required: step.required || false,
                    next_steps: step.next_steps || []
                });
                setShowNodeDialog(true);
            }
            
            onNodeClick({ step, flow });
        }, [editable, onNodeClick]);

        // Smart mapping for step IDs to intents
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

        // Get prompt for step
        const getPromptForStep = (step) => {
            if (!step || !step.id) return { template: null, intent: null, mappedIntent: 'unknown' };
            
            let stepIntent = step.id;
            
            // Use smart mapping
            if (stepToIntentMap[step.id]) {
                stepIntent = stepToIntentMap[step.id];
            }
            
            const promptTemplate = Array.isArray(promptTemplates) ? 
                promptTemplates.find(t => t.intent === stepIntent) : null;
            const intentDefinition = Array.isArray(intentDefinitions) ? 
                intentDefinitions.find(i => i.name === stepIntent) : null;
            
            return {
                template: promptTemplate,
                intent: intentDefinition,
                mappedIntent: stepIntent
            };
        };

        // Render single flow card
        const renderFlowCard = (flow, index) => {
            return React.createElement('div', {
                key: flow.id,
                className: 'flow-card',
                style: {
                    marginBottom: '30px',
                    padding: '20px',
                    border: '2px solid #374151',
                    borderRadius: '12px',
                    backgroundColor: '#1f2937',
                }
            }, [
                // Flow title
                React.createElement('h3', {
                    key: 'title',
                    style: {
                        color: '#22c55e',
                        marginBottom: '15px',
                        fontSize: '18px',
                        fontWeight: 'bold'
                    }
                }, `${flow.name} (${flow.steps?.length || 0} steps)`),
                
                // Flow steps in horizontal layout
                React.createElement('div', {
                    key: 'steps',
                    className: 'flow-steps-horizontal',
                    style: {
                        display: 'flex',
                        gap: '15px',
                        flexWrap: 'wrap',
                        alignItems: 'flex-start'
                    }
                }, (flow.steps || []).map((step, stepIndex) => {
                    const promptData = getPromptForStep(step);
                    const isActive = activeFlow === flow.id && step.id === activeFlow;
                    
                    // Enhanced node with ALL ReactFlow data
                    return React.createElement('div', {
                        key: step.id,
                        className: `flow-step-node-enhanced ${isActive ? 'active' : ''}`,
                        onClick: () => handleNodeClick(step, flow),
                        style: {
                            padding: '14px 18px',
                            borderRadius: '12px',
                            backgroundColor: promptData.template ? '#1e40af' : '#dc2626',
                            color: 'white',
                            cursor: 'pointer',
                            minWidth: '280px',
                            maxWidth: '320px',
                            border: isActive ? '3px solid #22c55e' : '1px solid rgba(255,255,255,0.2)',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                            transition: 'all 0.2s ease',
                            position: 'relative'
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
                            }, step.title || step.name || step.id),
                            
                            React.createElement('div', {
                                key: 'required-badge',
                                style: {
                                    fontSize: '9px',
                                    padding: '2px 6px',
                                    borderRadius: '10px',
                                    backgroundColor: step.required ? '#16a34a' : '#6b7280',
                                    color: 'white'
                                }
                            }, step.required ? 'REQ' : 'OPT')
                        ]),
                        
                        // Intent Info
                        React.createElement('div', {
                            key: 'intent-section',
                            style: { marginBottom: '8px' }
                        }, [
                            React.createElement('div', {
                                key: 'intent-name',
                                style: { fontSize: '11px', opacity: 0.9, fontWeight: '500' }
                            }, `Intent: ${promptData.mappedIntent}`),
                            
                            promptData.intent && React.createElement('div', {
                                key: 'intent-desc',
                                style: { fontSize: '9px', opacity: 0.7, marginTop: '2px' }
                            }, promptData.intent.description || 'No description')
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
                                    gap: '4px'
                                }
                            }, [
                                React.createElement('span', { key: 'icon' }, promptData.template ? '✅' : '❌'),
                                React.createElement('span', { key: 'text' }, promptData.template ? 'Template Ready' : 'No Template')
                            ]),
                            
                            promptData.template && React.createElement('div', {
                                key: 'system-prompt',
                                style: { 
                                    fontSize: '9px', 
                                    opacity: 0.8, 
                                    marginTop: '4px',
                                    maxHeight: '30px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }
                            }, `System: ${(promptData.template.system_prompt || '').substring(0, 60)}...`)
                        ]),
                        
                        // Conditions & Memory
                        (step.conditions?.length > 0 || step.memory_operation) && React.createElement('div', {
                            key: 'advanced-section',
                            style: { marginBottom: '6px' }
                        }, [
                            step.conditions?.length > 0 && React.createElement('div', {
                                key: 'conditions',
                                style: { fontSize: '9px', opacity: 0.7 }
                            }, `Conditions: ${step.conditions.length}`),
                            
                            step.memory_operation && React.createElement('div', {
                                key: 'memory',
                                style: { fontSize: '9px', opacity: 0.7 }
                            }, `Memory: ${step.memory_operation}`)
                        ]),
                        
                        // Knowledge & Vector Search
                        (step.knowledge_source || step.vector_search) && React.createElement('div', {
                            key: 'knowledge-section',
                            style: { marginBottom: '6px' }
                        }, [
                            step.knowledge_source && React.createElement('div', {
                                key: 'knowledge',
                                style: { fontSize: '9px', opacity: 0.7 }
                            }, `Knowledge: ${step.knowledge_source}`),
                            
                            step.vector_search && React.createElement('div', {
                                key: 'vector',
                                style: { fontSize: '9px', opacity: 0.7, color: '#fbbf24' }
                            }, '🔍 Vector Search')
                        ]),
                        
                        // Next Steps
                        step.next_steps?.length > 0 && React.createElement('div', {
                            key: 'next-steps',
                            style: { 
                                fontSize: '9px', 
                                opacity: 0.8,
                                borderTop: '1px solid rgba(255,255,255,0.2)',
                                paddingTop: '6px',
                                marginTop: '6px'
                            }
                        }, `Next: ${step.next_steps.join(', ')}`)
                    ]);
                }) || []),
                
                // Connection lines between steps (simple CSS)
                flow.steps?.length > 1 && React.createElement('div', {
                    key: 'connections',
                    style: {
                        marginTop: '10px',
                        fontSize: '12px',
                        color: '#9ca3af'
                    }
                }, `→ Flow: ${(flow.steps || []).map(s => s.name || s.id).join(' → ')}`)
            ]);
        };

        return React.createElement('div', {
            style: {
                width: '100%',
                height: '600px',
                overflowY: 'auto',
                padding: '20px',
                backgroundColor: '#0d1117'
            }
        }, [
            React.createElement('div', {
                key: 'cards-container'
            }, flowDefinitions.map(renderFlowCard)),
            
            // Node Edit Dialog (if needed)
            showNodeDialog && React.createElement('div', {
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
                    }, `Node Details: ${selectedNode?.step?.title || selectedNode?.step?.name || selectedNode?.step?.id}`),
                    
                    // Flow Info
                    React.createElement('div', {
                        key: 'flow-info',
                        style: { marginBottom: '16px', padding: '12px', backgroundColor: '#374151', borderRadius: '8px' }
                    }, [
                        React.createElement('h4', { key: 'flow-title', style: { color: '#60a5fa', marginBottom: '8px' } }, 'Flow Information'),
                        React.createElement('p', { key: 'flow-name' }, `Flow: ${selectedNode?.flow?.name}`),
                        React.createElement('p', { key: 'flow-id' }, `Flow ID: ${selectedNode?.flow?.id}`)
                    ]),
                    
                    // Step Properties
                    selectedNode?.step && React.createElement('div', {
                        key: 'step-props',
                        style: { marginBottom: '16px', padding: '12px', backgroundColor: '#374151', borderRadius: '8px' }
                    }, [
                        React.createElement('h4', { key: 'step-title', style: { color: '#60a5fa', marginBottom: '8px' } }, 'Step Properties'),
                        React.createElement('p', { key: 'id' }, `ID: ${selectedNode.step.id}`),
                        React.createElement('p', { key: 'desc' }, `Description: ${selectedNode.step.description || 'No description'}`),
                        React.createElement('p', { key: 'req' }, `Required: ${selectedNode.step.required ? 'Yes' : 'No'}`),
                        selectedNode.step.next_steps?.length > 0 && React.createElement('p', { key: 'next' }, `Next Steps: ${selectedNode.step.next_steps.join(', ')}`),
                        selectedNode.step.conditions?.length > 0 && React.createElement('p', { key: 'cond' }, `Conditions: ${selectedNode.step.conditions.length} defined`),
                        selectedNode.step.memory_operation && React.createElement('p', { key: 'mem' }, `Memory Operation: ${selectedNode.step.memory_operation}`),
                        selectedNode.step.knowledge_source && React.createElement('p', { key: 'know' }, `Knowledge Source: ${selectedNode.step.knowledge_source}`),
                        selectedNode.step.vector_search && React.createElement('p', { key: 'vec' }, 'Vector Search: Enabled')
                    ]),
                    
                    // Intent Info
                    React.createElement('div', {
                        key: 'intent-info',
                        style: { marginBottom: '16px', padding: '12px', backgroundColor: '#374151', borderRadius: '8px' }
                    }, [
                        React.createElement('h4', { key: 'intent-title', style: { color: '#60a5fa', marginBottom: '8px' } }, 'Intent Information'),
                        React.createElement('p', { key: 'intent-mapped' }, `Mapped Intent: ${getPromptForStep(selectedNode?.step || {}).mappedIntent}`),
                        getPromptForStep(selectedNode?.step || {}).intent && React.createElement('p', { key: 'intent-desc' }, `Description: ${getPromptForStep(selectedNode?.step || {}).intent.description}`),
                        getPromptForStep(selectedNode?.step || {}).intent?.keywords?.length > 0 && React.createElement('p', { key: 'keywords' }, `Keywords: ${getPromptForStep(selectedNode?.step || {}).intent.keywords.join(', ')}`)
                    ]),
                    
                    // Prompt Template Info
                    getPromptForStep(selectedNode?.step || {}).template && React.createElement('div', {
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
                            }, getPromptForStep(selectedNode?.step || {}).template.system_prompt || 'No system prompt')
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
                            }, getPromptForStep(selectedNode?.step || {}).template.user_prompt_template || 'No user prompt template')
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
                            cursor: 'pointer',
                            fontSize: '14px'
                        }
                    }, 'Close')
                ])
            ])
        ]);
    };

    // Export the component
    window.FlowCardEditor = FlowCardEditor;
