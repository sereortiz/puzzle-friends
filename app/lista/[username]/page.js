'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Gift, ExternalLink, CheckCircle2, Puzzle, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function ListaPresentesPublica({ params }) {
  const { username } = params
  const [profile, setProfile] = useState(null)
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [reservingId, setReservingId] = useState(null)
  const [guestName, setGuestName] = useState('')

  useEffect(() => {
    fetchWishlist()
  }, [username])

  async function fetchWishlist() {
    setLoading(true)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.toLowerCase())
      .single()

    if (userProfile) {
      setProfile(userProfile)
      const { data: items } = await supabase
        .from('user_puzzles')
        .select('*, puzzles(*)')
        .eq('user_id', userProfile.id)
        .eq('status', 'quero_montar')
        .order('updated_at', { ascending: false })

      setWishlist(items || [])
    }
    setLoading(false)
  }

  async function handleReserve(itemId) {
    if (!guestName.trim()) {
      alert('Por favor, digite seu nome para reservar o presente!')
      return
    }

    const { error } = await supabase
      .from('user_puzzles')
      .update({ reserved_by: guestName.trim() })
      .eq('id', itemId)

    if (!error) {
      setReservingId(null)
      setGuestName('')
      fetchWishlist()
    } else {
      alert('Não foi possível reservar agora. Tente novamente.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-slate-500 animate-pulse">Carregando lista de desejos...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Puzzle className="w-12 h-12 text-indigo-500 mb-3" />
        <h1 className="text-xl font-bold">Colecionador não encontrado</h1>
        <p className="text-slate-500 mt-1 mb-4">Verifique se o link da lista foi digitado corretamente.</p>
        <Link href="/" className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium">
          Conhecer o Puzzle Friends
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-slate-50">
      {/* Cabeçalho festivo */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 rounded-b-3xl shadow-md">
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
            <Gift className="w-3.5 h-3.5" /> Lista de Desejos
          </span>
          <Link href="/" className="text-xs underline text-indigo-100 hover:text-white">
            Criar minha lista
          </Link>
        </div>

        <h1 className="text-2xl font-bold">
          Quebra-cabeças de {profile.full_name || `@${profile.username}`}
        </h1>
        <p className="text-indigo-100 text-sm mt-1">
          Quer dar um presente sem risco de repetir? Escolha um item abaixo e marque como reservado (a surpresa fica oculta para {profile.full_name || profile.username}!).
        </p>
      </div>

      {/* Lista de Itens */}
      <div className="p-4 space-y-4 mt-2">
        {wishlist.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center border border-slate-100">
            <p className="text-slate-500">Nenhum quebra-cabeça na lista de desejos no momento.</p>
          </div>
        ) : (
          wishlist.map((item) => {
            const puzzle = item.puzzles
            const searchUrl = `https://lista.mercadolivre.com.br/quebra-cabeca-${encodeURIComponent(
              `${puzzle.title} ${puzzle.brand} ${puzzle.pieces} pecas`
            )}`

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-4 shadow-sm border transition ${
                  item.reserved_by ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'
                }`}
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
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

                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-indigo-600 uppercase">
                      {puzzle.brand} • {puzzle.pieces} peças
                    </span>
                    <h2 className="font-bold text-slate-900 leading-snug mt-0.5">{puzzle.title}</h2>

                    {item.notes && (
                      <p className="text-xs text-slate-500 mt-1 italic">"{item.notes}"</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg"
                      >
                        Buscar preço <ExternalLink className="w-3 h-3" />
                      </a>

                      {item.reserved_by ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Reservado por {item.reserved_by}
                        </span>
                      ) : (
                        <button
                          onClick={() => setReservingId(item.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg"
                        >
                          <Gift className="w-3.5 h-3.5" /> Vou dar de presente
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Caixa para confirmar reserva */}
                {reservingId === item.id && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                    <input
                      type="text"
                      placeholder="Seu nome (ex: Tia Ana)"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => handleReserve(item.id)}
                      className="bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setReservingId(null)}
                      className="text-slate-400 text-xs px-2"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
