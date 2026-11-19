import React, { useState, useRef, useEffect } from 'react';
import { Produto3D, CategoriaProduto3D } from '../types';
import { 
  X, 
  Check, 
  Package, 
  Sparkles, 
  UploadCloud, 
  Trash2, 
  Link as LinkIcon, 
  Camera 
} from 'lucide-react';

interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (produto: Produto3D, isEdit?: boolean) => void;
  produtoParaEditar?: Produto3D | null;
}

export const NewProductModal: React.FC<NewProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  produtoParaEditar = null,
}) => {
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [categoria, setCategoria] = useState<CategoriaProduto3D>('chaveiro_articulado');
  const [descricao, setDescricao] = useState('');
  const [precoVenda, setPrecoVenda] = useState<number>(15.00);
  const [custoProducao, setCustoProducao] = useState<number>(2.50);
  const [pesoGramas, setPesoGramas] = useState<number>(14);
  const [tempoImpressaoMin, setTempoImpressaoMin] = useState<number>(25);
  const [estoqueAtelie, setEstoqueAtelie] = useState<number>(20);
  const [cores, setCores] = useState('Preto, Azul Seda, Dourado');
  const [destaque, setDestaque] = useState(false);
  
  // Foto do produto
  const [fotoUrl, setFotoUrl] = useState('');
  const [mostrarInputUrl, setMostrarInputUrl] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setFormError(null);
    setMostrarInputUrl(false);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (produtoParaEditar) {
      setNome(produtoParaEditar.nome || '');
      setCodigo(produtoParaEditar.codigo || '');
      setCategoria(produtoParaEditar.categoria || 'chaveiro_articulado');
      setDescricao(produtoParaEditar.descricao || '');
      setPrecoVenda(produtoParaEditar.precoVenda ?? 15.0);
      setCustoProducao(produtoParaEditar.custoProducao ?? 2.5);
      setPesoGramas(produtoParaEditar.pesoGramas ?? 14);
      setTempoImpressaoMin(produtoParaEditar.tempoImpressaoMin ?? 25);
      setEstoqueAtelie(produtoParaEditar.estoqueAtelie ?? 0);
      setCores((produtoParaEditar.coresPopulares || []).join(', '));
      setFotoUrl(produtoParaEditar.fotoUrl || '');
      setDestaque(Boolean(produtoParaEditar.destaque));
    } else {
      setNome('');
      setCodigo('');
      setCategoria('chaveiro_articulado');
      setDescricao('');
      setPrecoVenda(15.0);
      setCustoProducao(2.5);
      setPesoGramas(14);
      setTempoImpressaoMin(25);
      setEstoqueAtelie(20);
      setCores('Preto, Azul Seda, Dourado');
      setFotoUrl('');
      setDestaque(false);
    }
  }, [isOpen, produtoParaEditar]);

  if (!isOpen) return null;

  const processImageFile = (file: File) => {
    setFormError(null);
    if (!file.type.startsWith('image/')) {
      setFormError('Por favor, selecione um arquivo de imagem (PNG, JPG ou WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const compress = (maxDim: number, quality: number) => {
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return '';
          ctx.drawImage(img, 0, 0, w, h);
          return canvas.toDataURL('image/jpeg', quality);
        };

        let compressedDataUrl = compress(500, 0.82);
        if (compressedDataUrl.length > 320000) {
          compressedDataUrl = compress(380, 0.65);
        }
        if (compressedDataUrl.length > 345000) {
          setFormError('A imagem selecionada é muito grande mesmo comprimida. Escolha uma foto menor.');
          return;
        }
        if (compressedDataUrl) {
          setFotoUrl(compressedDataUrl);
        }
      };
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!nome.trim()) {
      setFormError('Por favor, digite o nome do produto 3D.');
      return;
    }
    if (fotoUrl.trim().length > 350000) {
      setFormError('O link/foto excede o tamanho máximo suportado. Use uma imagem menor.');
      return;
    }

    const safeNumber = (v: number, fallback = 0) =>
      Number.isFinite(v) ? Math.max(0, v) : fallback;

    const isEdit = Boolean(produtoParaEditar);

    const produtoFinal: Produto3D = {
      id: produtoParaEditar ? produtoParaEditar.id : `prod-${Date.now()}`,
      codigo: codigo.trim().toUpperCase() || undefined,
      nome: nome.trim(),
      categoria,
      descricao: descricao.trim() || 'Chaveiro impresso em 3D com excelente acabamento e argola metálica.',
      precoVenda: safeNumber(precoVenda, 15),
      custoProducao: safeNumber(custoProducao, 0),
      pesoGramas: safeNumber(pesoGramas, 0),
      tempoImpressaoMin: safeNumber(tempoImpressaoMin, 0),
      estoqueAtelie: Math.floor(safeNumber(estoqueAtelie, 0)),
      totalConsignado: produtoParaEditar ? produtoParaEditar.totalConsignado || 0 : 0,
      coresPopulares: cores.split(',').map(c => c.trim()).filter(Boolean),
      destaque,
      fotoUrl: fotoUrl.trim() || undefined,
    };

    onSave(produtoFinal, isEdit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {produtoParaEditar ? 'Editar Chaveiro / Produto 3D' : 'Cadastrar Chaveiro / Produto 3D'}
              </h3>
              <p className="text-xs text-slate-400">
                {produtoParaEditar
                  ? 'Atualize as informações, foto e valores do modelo no catálogo'
                  : 'Novo modelo para o catálogo e remessas em consignação'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-slate-800">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {formError}
            </div>
          )}
          
          {/* Foto do Produto 3D */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-teal-600" />
                Foto do Produto 3D
              </label>
              <button
                type="button"
                onClick={() => setMostrarInputUrl(!mostrarInputUrl)}
                className="text-[11px] text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1"
              >
                <LinkIcon className="w-3 h-3" />
                {mostrarInputUrl ? 'Enviar arquivo do celular/PC' : 'Ou colar link web'}
              </button>
            </div>

            {/* Input oculto de arquivo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {fotoUrl ? (
              /* Preview da Foto */
              <div className="flex items-center gap-3.5 bg-white border border-slate-200 p-2.5 rounded-xl shadow-2xs">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <img
                    src={fotoUrl}
                    alt="Prévia do produto"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <Check className="w-3.5 h-3.5" />
                    <span>Foto carregada com sucesso!</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    Esta imagem será exibida no catálogo e na conferência de acerto.
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-lg border border-teal-200 transition-colors"
                    >
                      Trocar Foto
                    </button>
                    <button
                      type="button"
                      onClick={() => setFotoUrl('')}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ) : mostrarInputUrl ? (
              /* Input de URL */
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://exemplo.com/foto-chaveiro.jpg"
                    value={fotoUrl}
                    onChange={(e) => setFotoUrl(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarInputUrl(false)}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Cole o link direto da imagem (formato JPG, PNG ou WEBP).
                </p>
              </div>
            ) : (
              /* Área de Upload / Arraste */
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-teal-500 bg-teal-50/50' 
                    : 'border-slate-300 hover:border-teal-500 bg-white hover:bg-slate-50/80'
                }`}
              >
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700">
                      Clique para escolher a foto ou tire com a câmera
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Arraste uma foto aqui ou selecione da sua galeria (PNG, JPG, WEBP)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nome do Modelo 3D *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Chaveiro Tubarão Flexi Articulado"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Código / Ref (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: PRD-11, CHV-05"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-mono uppercase font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaProduto3D)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="chaveiro_articulado">Articulado (Flexi)</option>
                <option value="chaveiro_automotivo">Motos & Carros</option>
                <option value="chaveiro_geek">Geek & Games</option>
                <option value="chaveiro_personalizado">Letras & Nomes</option>
                <option value="chaveiro_pet">Pets & Cachorros</option>
                <option value="suporte_3d">Suportes & Gadgets</option>
                <option value="chaveiro_religioso">Religiosos</option>
                <option value="decorativo_miniatura">Miniaturas Decorativas</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Estoque Pronto Ateliê
              </label>
              <input
                type="number"
                min="0"
                value={estoqueAtelie}
                onChange={(e) => setEstoqueAtelie(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Preço Consumidor (R$)
              </label>
              <input
                type="number"
                step="0.5"
                value={precoVenda}
                onChange={(e) => setPrecoVenda(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Custo de Produção (R$)
              </label>
              <input
                type="number"
                step="0.1"
                value={custoProducao}
                onChange={(e) => setCustoProducao(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-rose-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Peso Filamento (g)
              </label>
              <input
                type="number"
                value={pesoGramas}
                onChange={(e) => setPesoGramas(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tempo Impressão (min)
              </label>
              <input
                type="number"
                value={tempoImpressaoMin}
                onChange={(e) => setTempoImpressaoMin(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Cores Mais Pedidas (separadas por vírgula)
            </label>
            <input
              type="text"
              placeholder="Ex: Seda Dourado, Preto com Vermelho, Azul Metálico"
              value={cores}
              onChange={(e) => setCores(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Descrição do Modelo 3D
            </label>
            <textarea
              rows={2}
              placeholder="Detalhes, acabamento, tipo de argola..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={destaque}
              onChange={(e) => setDestaque(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Destacar como Mais Vendido</span>
          </label>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {produtoParaEditar ? 'Salvar Alterações' : 'Salvar Modelo no Catálogo'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
