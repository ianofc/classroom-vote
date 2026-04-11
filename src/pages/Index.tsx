// ============================================================================
  // A MENTE DO TSE: LÓGICA DE QUAIS ELEIÇÕES O ALUNO PODE VOTAR E QUAIS CANDIDATOS VÊ
  // ============================================================================
  const selectVoter = async (student: any) => {
    setLoadingCandidates(true);
    setVoterData(student);
    setSearchQuery("");
    setSearchResults([]);
    
    if (activeElections.length === 0) {
      toast({ title: "Nenhuma Eleição Ativa", description: "O gestor precisa abrir uma eleição no painel.", variant: "destructive" });
      setLoadingCandidates(false);
      return;
    }

    let allowedRoles: string[] = [];

    // 1. Descobre a quais eleições esse aluno tem direito
    activeElections.forEach(eleicao => {
      if (eleicao.tipo === 'universal') {
        // UNIVERSAL: Todos votam
        if (!allowedRoles.includes(eleicao.nome)) allowedRoles.push(eleicao.nome);
      } 
      else if (eleicao.tipo === 'geral') {
        // GERAL RESTRITA: Só vota quem tem o mesmo cargo
        if (student.candidate_role && eleicao.nome.toLowerCase() === student.candidate_role.toLowerCase()) {
          if (!allowedRoles.includes(eleicao.nome)) allowedRoles.push(eleicao.nome);
        }
      }
      else if (eleicao.tipo === 'turma') {
        // TURMA: Todos da turma votam na eleição local
        if (!allowedRoles.includes(eleicao.nome)) allowedRoles.push(eleicao.nome);
      }
    });

    if (allowedRoles.length === 0) {
      toast({ title: "Acesso Negado", description: "Este aluno não possui perfil para votar nas eleições atualmente abertas.", variant: "destructive" });
      setLoadingCandidates(false);
      setVoterData(null);
      return;
    }

    // 2. Busca TODOS os candidatos do banco que concorrem a esses papéis permitidos
    const { data: allCandidatesData } = await supabase
      .from('students')
      .select('*')
      .in('candidate_role', allowedRoles)
      .eq('is_candidate', true);

    // 3. O FILTRO DE OURO: Garante que eleição de 'turma' só mostre candidatos da mesma turma
    const finalCandidates = allCandidatesData?.filter(cand => {
      const eleicaoReferente = activeElections.find(e => e.nome === cand.candidate_role);
      
      if (eleicaoReferente?.tipo === 'turma') {
        return cand.turma_id === student.turma_id; // Se for de turma, oculta alunos de outras salas
      }
      
      return true; // Se for Universal ou Geral, mostra os candidatos da escola inteira
    }) || [];

    // 4. Monta o pacote inteligente para a Urna
    setUrnaPayload({
      id: student.turma_id,
      name: student.turmas?.name,
      allowedRoles: allowedRoles, 
      candidates: finalCandidates
    });

    setPhase("setup");
    setLoadingCandidates(false);
  };
