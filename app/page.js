'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Puzzle,
  Search,
  PlusCircle,
  Users,
  User,
  Sparkles,
  Share2,
  Star,
  ExternalLink,
  Check,
  UserPlus,
  UserCheck,
  LogOut,
  Camera,
  Loader2,
  Trash2,
} from 'lucide-react'

export default function PuzzleFriendsApp() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('estante') // estante | explorar | cadastrar | comunidade
  const [loading, setLoading] = useState(true)

  // Estados de Login/Registro
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Dados do App
  const [myShelf, setMyShelf] = useState([])
  const [shelfFilter, setShelfFilter] = useState('montado') // montado | na_fila | quero_montar
  const [catalog, setCatalog] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [pieceFilter, setPieceFilter] = useState('todos') // todos | <500 | 500 | 1000 | 1500 | 2000 | 3000+

  // Comunidade & Seguidores
  const [feed, setFeed] = useState([])
  const [feedMode, setFeedMode] = useState('todos') // todos | seguindo
  const [followingIds, setFollowingIds] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')

  // Formulário de Cadastro / Registro
  const [selectedExistingPuzzle, setSelectedExistingPuzzle] = useState(null)
  const [boxFile, setBoxFile] = useState(null)
  const [boxPreview, setBoxPreview] = useState(null)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [title, setTitle] = useState('')
  const [brand, setBrand] = useState('')
  const [pieces, setPieces] = useState('1000')
  const [status, setStatus] = useState('montado')
  const [yearBought, setYearBought] = useState(new Date().getFullYear().toString())
  const [yearCompleted, setYearCompleted] = useState(new Date().getFullYear().toString())
  const [rating, setRating] = useState(5)
  const [notes, setNotes] = useState('')
  const [savingPuzzle, setSavingPuzzle] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadUserData(session.user)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadUserData(session.user)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadUserData(user) {
    setLoading(true)
    // Busca ou cria perfil
    let { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()

    if (!prof) {
      const cleanUser =
        (user.user_metadata?.username || user.email.split('@')[0])
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '') +
        Math.floor(10 + Math.random() * 89)
      const { data: newProf } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: cleanUser,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
        })
        .select()
        .single()
      prof = newProf
    }
    setProfile(prof)

    await Promise.all([
      fetchMyShelf(user.id),
      fetchCatalog(),
      fetchFeed(),
      fetchSocial(user.id),
    ])
    setLoading(false)
  }

  async function fetchMyShelf(userId) {
    const { data } = await supabase
      .from('user_puzzles')
      .select('*, puzzles(*)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    setMyShelf(data || [])
  }

  async function fetchCatalog() {
    const { data } = await supabase
      .from('puzzles')
      .select('*')
      .order('created_at', { ascending: false })
    setCatalog(data || [])
  }

  async function fetchFeed() {
    const { data } = await supabase
      .from('user_puzzles')
      .select('*, puzzles(*), profiles(*)')
      .order('updated_at', { ascending: false })
      .limit(40)
    setFeed(data || [])
  }

  async function fetchSocial(userId) {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
    setFollowingIds((follows || []).map((f) => f.following_id))

    const { data: users } = await supabase.from('profiles').select('*').neq('id', userId).limit(30)
    setAllUsers(users || [])
  }

  // Autenticação
  async function handleAuth(e) {
    e.preventDefault()
    setAuthLoading(true)
    if (isSignUp) {
      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '')
      if (!cleanUsername) {
        alert('Escolha um nome de usuário válido (apenas letras e números).')
        setAuthLoading(false)
        return
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, username: cleanUsername },
        },
      })
      if (error) alert('Erro ao cadastrar: ' + error.message)
      else alert('Conta criada! Se necessário, confirme seu e-mail ou faça login.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert('E-mail ou senha inválidos.')
    }
    setAuthLoading(false)
  }

  // Foto da Caixa + Análise com IA Gemini
  function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBoxFile(file)
    setBoxPreview(URL.createObjectURL(file))
  }

  async function handleAnalyzeWithAI() {
    if (!boxFile) return
    setAiAnalyzing(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result.split(',')[1]
        const res = await fetch('/api/analyze-box', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64String,
            mimeType: boxFile.type,
          }),
        })
        const data = await res.json()
        if (data.title) setTitle(data.title)
        if (data.brand) setBrand(data.brand)
        if (data.pieces) setPieces(String(data.pieces))
        setAiAnalyzing(false)
      }
      reader.readAsDataURL(boxFile)
    } catch (err) {
      alert('Não foi possível ler a imagem agora. Preencha manualmente.')
      setAiAnalyzing(false)
    }
  }

  // Salvar Quebra-Cabeça no Catálogo e na Estante
  async function handleSavePuzzle(e) {
    e.preventDefault()
    if (!session || !profile) return
    setSavingPuzzle(true)

    try {
      let puzzleId = selectedExistingPuzzle?.id

      if (!puzzleId) {
        let imageUrl = null
        if (boxFile) {
          const fileExt = boxFile.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          const { error: uploadError } = await supabase.storage
            .from('puzzle-images')
            .upload(fileName, boxFile)

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('puzzle-images')
              .getPublicUrl(fileName)
            imageUrl = publicUrlData.publicUrl
          }
        }

        const { data: newPuzzle, error: puzzleError } = await supabase
          .from('puzzles')
          .insert({
            title: title.trim(),
            brand: brand.trim() || 'Outra',
            pieces: parseInt(pieces, 10) || 1000,
            box_image_url: imageUrl,
            created_by: profile.id,
          })
          .select()
          .single()

        if (puzzleError) throw puzzleError
        puzzleId = newPuzzle.id
      }

      const { error: shelfError } = await supabase.from('user_puzzles').upsert(
        {
          user_id: profile.id,
          puzzle_id: puzzleId,
          status,
          year_bought: yearBought ? parseInt(yearBought, 10) : null,
          year_completed: status === 'montado' && yearCompleted ? parseInt(yearCompleted, 10) : null,
          rating: status === 'montado' ? rating : null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,puzzle_id' }
      )

      if (shelfError) throw shelfError

      // Limpa formulário e volta para a estante
      setSelectedExistingPuzzle(null)
      setBoxFile(null)
      setBoxPreview(null)
      setTitle('')
      setBrand('')
      setPieces('1000')
      setNotes('')
      await Promise.all([fetchMyShelf(profile.id), fetchCatalog(), fetchFeed()])
      setShelfFilter(status)
      setActiveTab('estante')
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    }
    setSavingPuzzle(false)
  }

  async function handleRemoveFromShelf(itemId) {
    if (!confirm('Remover este quebra-cabeça da sua estante?')) return
    await supabase.from('user_puzzles').delete().eq('id', itemId)
    fetchMyShelf(profile.id)
    fetchFeed()
  }

  async function toggleFollow(targetUserId) {
    if (!profile) return
    if (followingIds.includes(targetUserId)) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', profile.id)
        .eq('following_id', targetUserId)
      setFollowingIds(followingIds.filter((id) => id !== targetUserId))
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: profile.id, following_id: targetUserId })
      setFollowingIds([...followingIds, targetUserId])
    }
  }

  function handleShareWishlist() {
    if (!profile) return
    const shareUrl = `${window.location.origin}/lista/${profile.username}`
    if (navigator.share) {
      navigator.share({
        title: `Lista de Quebra-Cabeças de ${profile.full_name || profile.username}`,
        text: 'Olha os quebra-cabeças que eu quero montar! Se quiser me dar algum de presente, dá para reservar direto pelo link:',
        url: shareUrl,
      })
    } else {
      navigator.clipboard.writeText(shareUrl)
      alert('Link da sua lista de presentes copiado! Agora é só colar no WhatsApp:\n' + shareUrl)
    }
  }

  // Tela de Carregamento
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    )
  }

  // Tela de Login / Cadastro
  if (!session) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col justify-center p-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Puzzle className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900">Puzzle Friends</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Sua estante virtual de quebra-cabeças, comunidade de colecionadores e lista de presentes.
          </p>
        </div>

        <form onSubmit={handleAuth} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="font-bold text-lg text-center">
            {isSignUp ? 'Criar minha conta gratuita' : 'Entrar na minha estante'}
          </h2>

          {isSignUp && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-600">Seu Nome</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Nome de Usuário (para seu link de presentes)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: carlos_puzzles"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600">E-mail</label>
            <input
              type="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Senha</label>
            <input
              type="password"
              required
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition"
          >
            {authLoading ? 'Aguarde...' : isSignUp ? 'Criar Conta' : 'Entrar'}
          </button>

          <p className="text-center text-xs text-slate-500 pt-2">
            {isSignUp ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-indigo-600 font-bold underline"
            >
              {isSignUp ? 'Fazer login' : 'Cadastre-se grátis'}
            </button>
          </p>
        </form>
      </div>
    )
  }

  // Cálculos de Estatísticas do Usuário
  const completedPuzzles = myShelf.filter((item) => item.status === 'montado')
  const totalPiecesMounted = completedPuzzles.reduce(
    (acc, item) => acc + (item.puzzles?.pieces || 0),
    0
  )
  const filteredShelf = myShelf.filter((item) => item.status === shelfFilter)

  // Filtro do Catálogo Explorar
  const filteredCatalog = catalog.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false
    if (pieceFilter === 'todos') return true
    if (pieceFilter === '<500') return p.pieces < 500
    if (pieceFilter === '3000+') return p.pieces >= 3000
    return p.pieces === parseInt(pieceFilter, 10)
  })

  // Filtro do Feed Comunidade
  const visibleFeed =
    feedMode === 'seguindo'
      ? feed.filter((item) => followingIds.includes(item.user_id))
      : feed

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-slate-50">
      {/* Barra Superior */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center">
            <Puzzle className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900">Puzzle Friends</span>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          title="Sair"
          className="text-slate-400 hover:text-slate-600 p-1.5"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* ABA 1: MINHA ESTANTE */}
      {activeTab === 'estante' && (
        <div className="p-4 space-y-5">
          {/* Cartão de Perfil e Estatísticas */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-3xl p-5 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">{profile?.full_name}</h1>
                <p className="text-indigo-200 text-xs">@{profile?.username}</p>
              </div>
              <div className="text-right text-xs text-indigo-100">
                <span className="font-bold text-white">{followingIds.length}</span> seguindo
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3">
                <p className="text-xs text-indigo-100">Montados</p>
                <p className="text-2xl font-extrabold">{completedPuzzles.length}</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3">
                <p className="text-xs text-indigo-100">Peças encaixadas</p>
                <p className="text-2xl font-extrabold">
                  {totalPiecesMounted.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {/* Seletor das 3 Prateleiras */}
          <div className="flex bg-slate-200/70 p-1 rounded-2xl">
            {[
              { id: 'montado', label: 'Montados' },
              { id: 'na_fila', label: 'Na Fila' },
              { id: 'quero_montar', label: 'Quero Montar' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setShelfFilter(tab.id)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                  shelfFilter === tab.id
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label} ({myShelf.filter((i) => i.status === tab.id).length})
              </button>
            ))}
          </div>

          {/* Botão Especial de Compartilhar Lista de Presentes */}
          {shelfFilter === 'quero_montar' && (
            <button
              onClick={handleShareWishlist}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              <Share2 className="w-4 h-4" /> Compartilhar Lista de Presentes (WhatsApp)
            </button>
          )}

          {/* Lista de Quebra-Cabeças da Prateleira */}
          <div className="space-y-3">
            {filteredShelf.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
                <p className="text-slate-500 text-sm">Nenhum quebra-cabeça nesta prateleira ainda.</p>
                <button
                  onClick={() => setActiveTab('cadastrar')}
                  className="mt-3 text-indigo-600 font-bold text-sm underline"
                >
                  + Adicionar meu primeiro quebra-cabeça
                </button>
              </div>
            ) : (
              filteredShelf.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 flex gap-3.5"
                >
                  <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.puzzles?.box_image_url ? (
                      <img
                        src={item.puzzles.box_image_url}
                        alt={item.puzzles.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Puzzle className="w-7 h-7 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-bold text-indigo-600 uppercase">
                        {item.puzzles?.brand} • {item.puzzles?.pieces} pçs
                      </span>
                      <button
                        onClick={() => handleRemoveFromShelf(item.id)}
                        className="text-slate-300 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm truncate">
                      {item.puzzles?.title}
                    </h3>

                    <div className="text-xs text-slate-500 mt-1 space-x-2">
                      {item.year_bought && <span>Comprou: {item.year_bought}</span>}
                      {item.status === 'montado' && item.year_completed && (
                        <span>• Montou: {item.year_completed}</span>
                      )}
                    </div>

                    {item.status === 'montado' && item.rating && (
                      <div className="flex items-center gap-0.5 mt-1">
                        {[...Array(item.rating)].map((_, idx) => (
                          <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    )}

                    {item.notes && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">"{item.notes}"</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ABA 2: EXPLORAR CATÁLOGO */}
      {activeTab === 'explorar' && (
        <div className="p-4 space-y-4">
          <h1 className="text-xl font-extrabold">Catálogo da Comunidade</h1>

          {/* Busca */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome ou marca (Grow, Toyster...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm"
            />
          </div>

          {/* Filtros de Peças (Incluindo < 500) */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {['todos', '<500', '500', '1000', '1500', '2000', '3000+'].map((faixa) => (
              <button
                key={faixa}
                onClick={() => setPieceFilter(faixa)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  pieceFilter === faixa
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {faixa === 'todos' ? 'Todos' : `${faixa} pçs`}
              </button>
            ))}
          </div>

          {/* Grade de Resultados */}
          <div className="grid grid-cols-2 gap-3">
            {filteredCatalog.map((puzzle) => {
              const mlUrl = `https://lista.mercadolivre.com.br/quebra-cabeca-${encodeURIComponent(
                `${puzzle.title} ${puzzle.brand} ${puzzle.pieces}`
              )}`
              return (
                <div
                  key={puzzle.id}
                  className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-square rounded-xl bg-slate-100 overflow-hidden mb-2.5 flex items-center justify-center">
                      {puzzle.box_image_url ? (
                        <img
                          src={puzzle.box_image_url}
                          alt={puzzle.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Puzzle className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase">
                      {puzzle.brand} • {puzzle.pieces} pçs
                    </span>
                    <h3 className="font-bold text-xs text-slate-900 line-clamp-2 mt-0.5">
                      {puzzle.title}
                    </h3>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <button
                      onClick={() => {
                        setSelectedExistingPuzzle(puzzle)
                        setTitle(puzzle.title)
                        setBrand(puzzle.brand)
                        setPieces(String(puzzle.pieces))
                        setActiveTab('cadastrar')
                      }}
                      className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] py-1.5 rounded-lg"
                    >
                      + Na minha estante
                    </button>
                    <a
                      href={mlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 py-1"
                    >
                      Ver preços <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ABA 3: CADASTRAR / REGISTRAR */}
      {activeTab === 'cadastrar' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold">
              {selectedExistingPuzzle ? 'Adicionar à Estante' : 'Cadastrar Quebra-Cabeça'}
            </h1>
            {selectedExistingPuzzle && (
              <button
                onClick={() => {
                  setSelectedExistingPuzzle(null)
                  setTitle('')
                  setBrand('')
                  setPieces('1000')
                }}
                className="text-xs text-indigo-600 underline"
              >
                Cadastrar novo modelo
              </button>
            )}
          </div>

          <form onSubmit={handleSavePuzzle} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            {/* Upload de Foto + Botão IA Gemini */}
            {!selectedExistingPuzzle && (
              <div className="space-y-3">
                <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center cursor-pointer hover:border-indigo-400 transition">
                  {boxPreview ? (
                    <img
                      src={boxPreview}
                      alt="Prévia da caixa"
                      className="max-h-48 mx-auto rounded-xl object-contain"
                    />
                  ) : (
                    <div className="py-4">
                      <Camera className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">
                        Tirar foto ou escolher imagem da caixa
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        A IA pode ler o título e peças automaticamente
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>

                {boxFile && (
                  <button
                    type="button"
                    onClick={handleAnalyzeWithAI}
                    disabled={aiAnalyzing}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm"
                  >
                    {aiAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Lendo caixa com IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Preencher dados automaticamente com IA
                      </>
                    )}
                  </button>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-600">Título do Quebra-Cabeça</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Noite Estrelada - Van Gogh"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full mt-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Fabricante / Marca</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Grow, Toyster..."
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="w-full mt-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Número de Peças</label>
                    <input
                      type="number"
                      required
                      placeholder="1000"
                      value={pieces}
                      onChange={(e) => setPieces(e.target.value)}
                      className="w-full mt-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedExistingPuzzle && (
              <div className="bg-indigo-50 p-3 rounded-2xl">
                <p className="text-xs font-bold text-indigo-600 uppercase">
                  {selectedExistingPuzzle.brand} • {selectedExistingPuzzle.pieces} peças
                </p>
                <p className="font-bold text-slate-900">{selectedExistingPuzzle.title}</p>
              </div>
            )}

            <hr className="border-slate-100" />

            {/* Dados Pessoais do Colecionador */}
            <div>
              <label className="text-xs font-semibold text-slate-600">Qual a situação dele?</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white"
              >
                <option value="montado">Já montei</option>
                <option value="na_fila">Tenho na fila para montar</option>
                <option value="quero_montar">Quero montar (Lista de Desejos / Presentes)</option>
              </select>
            </div>

            {status !== 'quero_montar' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Ano que comprou</label>
                  <input
                    type="number"
                    placeholder="2025"
                    value={yearBought}
                    onChange={(e) => setYearBought(e.target.value)}
                    className="w-full mt-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                  />
                </div>
                {status === 'montado' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Ano que montou</label>
                    <input
                      type="number"
                      placeholder="2026"
                      value={yearCompleted}
                      onChange={(e) => setYearCompleted(e.target.value)}
                      className="w-full mt-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {status === 'montado' && (
              <div>
                <label className="text-xs font-semibold text-slate-600">Sua nota (1 a 5 estrelas)</label>
                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-600">
                Observações (opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Encaixe excelente, peças bem recortadas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full mt-1 border border-slate-200 rounded-xl px-3.5 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={savingPuzzle}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl shadow-sm transition"
            >
              {savingPuzzle ? 'Salvando na estante...' : 'Salvar na Minha Estante'}
            </button>
          </form>
        </div>
      )}

      {/* ABA 4: COMUNIDADE & AMIGOS */}
      {activeTab === 'comunidade' && (
        <div className="p-4 space-y-5">
          <h1 className="text-xl font-extrabold">Comunidade & Amigos</h1>

          {/* Encontrar Amigos para Seguir */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
            <h2 className="text-xs font-bold uppercase text-slate-500">Encontrar Colecionadores</h2>
            <input
              type="text"
              placeholder="Filtrar por nome ou @usuario..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allUsers
                .filter(
                  (u) =>
                    u.username.includes(userSearch.toLowerCase()) ||
                    (u.full_name || '').toLowerCase().includes(userSearch.toLowerCase())
                )
                .map((u) => {
                  const isFollowing = followingIds.includes(u.id)
                  return (
                    <div
                      key={u.id}
                      className="min-w-[140px] bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-col justify-between"
                    >
                      <div>
                        <p className="font-bold text-xs text-slate-900 truncate">{u.full_name}</p>
                        <p className="text-[11px] text-slate-500 truncate">@{u.username}</p>
                      </div>
                      <button
                        onClick={() => toggleFollow(u.id)}
                        className={`mt-2.5 w-full py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${
                          isFollowing
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {isFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" /> Seguindo
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" /> Seguir
                          </>
                        )}
                      </button>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Filtro do Feed: Todos vs Seguindo */}
          <div className="flex bg-slate-200/70 p-1 rounded-2xl">
            <button
              onClick={() => setFeedMode('todos')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl ${
                feedMode === 'todos' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              Toda a Comunidade
            </button>
            <button
              onClick={() => setFeedMode('seguindo')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl ${
                feedMode === 'seguindo' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              Apenas Seguindo ({followingIds.length})
            </button>
          </div>

          {/* Linha do Tempo */}
          <div className="space-y-3">
            {visibleFeed.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-8">
                Nenhuma atividade recente por aqui ainda.
              </p>
            ) : (
              visibleFeed.map((item) => {
                const statusText =
                  item.status === 'montado'
                    ? 'montou'
                    : item.status === 'na_fila'
                    ? 'colocou na fila'
                    : 'quer montar'

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-700">
                        <span className="font-bold text-slate-900">
                          {item.profiles?.full_name || `@${item.profiles?.username}`}
                        </span>{' '}
                        {statusText}:
                      </p>
                      {item.year_completed && item.status === 'montado' && (
                        <span className="text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                          Montado em {item.year_completed}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-3 items-center">
                      <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {item.puzzles?.box_image_url ? (
                          <img
                            src={item.puzzles.box_image_url}
                            alt={item.puzzles.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Puzzle className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-indigo-600 uppercase">
                          {item.puzzles?.brand} • {item.puzzles?.pieces} pçs
                        </span>
                        <h3 className="font-bold text-sm text-slate-900">{item.puzzles?.title}</h3>
                        {item.notes && (
                          <p className="text-xs text-slate-500 mt-0.5 italic">"{item.notes}"</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Barra de Navegação Inferior (Estilo App Nativo) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 max-w-lg mx-auto flex justify-around py-2 z-30">
        {[
          { id: 'estante', label: 'Estante', icon: User },
          { id: 'explorar', label: 'Explorar', icon: Search },
          { id: 'cadastrar', label: 'Adicionar', icon: PlusCircle },
          { id: 'comunidade', label: 'Amigos', icon: Users },
        ].map((nav) => {
          const Icon = nav.icon
          const active = activeTab === nav.id
          return (
            <button
              key={nav.id}
              onClick={() => setActiveTab(nav.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition ${
                active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold">{nav.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
