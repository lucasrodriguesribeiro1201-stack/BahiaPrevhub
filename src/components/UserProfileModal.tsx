import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Upload, 
  Camera, 
  Check, 
  User, 
  AlertCircle, 
  Briefcase, 
  ShieldCheck,
  Mail,
  Trash2
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { formatUserName } from '../utils/userNameFormatter';

interface UserProfileModalProps {
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ onClose }) => {
  const { profile, updateAvatarUrl } = useAuth();
  
  const [previewUrl, setPreviewUrl] = useState<string>(profile?.avatarUrl || '');
  const [saving, setSaving] = useState(false);
  const [compressingImage, setCompressingImage] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formattedName = formatUserName(profile?.name, profile?.email) || 'Colaborador';
  const roleName = profile?.role || 'Colaborador';
  const emailName = profile?.email || '';

  useEffect(() => {
    if (profile?.avatarUrl) {
      setPreviewUrl(profile.avatarUrl);
    }
  }, [profile]);

  // Compress & convert file to data URL
  const handleFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase()) && !file.type.startsWith('image/')) {
      setErrorMsg('Por favor, envie um arquivo de imagem (JPG, PNG ou WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('A imagem deve ter no máximo 10MB.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setCompressingImage(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 280;
        const MAX_HEIGHT = 280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setPreviewUrl(dataUrl);
        } else {
          setPreviewUrl(e.target?.result as string);
        }
        setCompressingImage(false);
      };
      img.onerror = () => {
        setErrorMsg('Erro ao carregar a imagem. Tente outra imagem.');
        setCompressingImage(false);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setErrorMsg('Erro ao ler arquivo.');
      setCompressingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const initialAvatar = profile?.avatarUrl || '';
  const hasPhotoChanged = previewUrl !== initialAvatar;

  const handleCancelChanges = () => {
    setPreviewUrl(initialAvatar);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleRemovePhoto = () => {
    setPreviewUrl('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSavePhoto = async () => {
    if (compressingImage) {
      setErrorMsg('Aguarde o processamento da imagem terminar...');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await updateAvatarUrl(previewUrl);
      setSuccessMsg('Foto de perfil salva com sucesso no banco de dados!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Erro ao atualizar foto de perfil:', err);
      setErrorMsg(err?.message || 'Não foi possível salvar a foto. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl border border-slate-200/80 relative overflow-hidden space-y-5 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>MEU PERFIL</span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">
              Foto de Perfil
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalize sua imagem de identificação no sistema
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Read-Only User Information Card */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100/80 text-blue-700 rounded-xl shrink-0">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome do Colaborador</span>
              <span className="text-xs font-extrabold text-slate-800 truncate block">{formattedName}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
            <div className="flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cargo / Função</span>
                <span className="text-[11px] font-bold text-slate-700 truncate block">{roleName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">E-mail</span>
                <span className="text-[11px] font-bold text-slate-700 truncate block">{emailName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold animate-in fade-in duration-200">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Avatar Preview */}
        <div className="flex flex-col items-center justify-center space-y-3 py-2">
          <div className="relative group">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Pré-visualização"
                className="h-28 w-28 rounded-full object-cover border-4 border-blue-500 shadow-xl"
              />
            ) : (
              <div className="h-28 w-28 rounded-full bg-slate-900 text-white font-extrabold text-3xl flex items-center justify-center border-4 border-slate-300 shadow-lg">
                {formattedName.charAt(0).toUpperCase()}
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg border-2 border-white transition-all cursor-pointer hover:scale-110"
              title="Selecionar nova foto"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Upload className="h-3.5 w-3.5 text-blue-600" />
              <span>Selecionar Outra Foto</span>
            </button>

            {previewUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1 border border-red-200/60"
                title="Remover foto atual"
              >
                <Trash2 className="h-3 w-3" />
                <span>Remover</span>
              </button>
            )}
          </div>
        </div>

        {/* Upload Box Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
            dragActive 
              ? 'border-blue-500 bg-blue-50/80 scale-[1.01]' 
              : 'border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="h-8 w-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Upload className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              Clique para escolher ou arraste uma foto aqui
            </span>
            <span className="text-[10px] text-slate-400">
              Formatos aceitos: JPG, PNG ou WEBP (máx. 10MB)
            </span>
          </div>
        </div>

        {/* Action Buttons: Dynamically adapts based on whether photo was changed */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          {!hasPhotoChanged ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancelChanges}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={saving || compressingImage}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Salvando Foto...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Salvar Foto</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
