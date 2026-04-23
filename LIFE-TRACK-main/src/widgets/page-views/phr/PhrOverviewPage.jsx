import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/app/providers/AuthProvider";
import { getPhrOverview, updatePhrOverview } from "@/features/phr/api/phrApi";
import { buildPhrOverviewFormState } from "@/features/phr/lib/phrOverviewModel";
import { PhrOverviewContent } from "@/features/phr/ui/PhrOverviewContent";

export function PhrOverviewPage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(() => buildPhrOverviewFormState());
  const [originalData, setOriginalData] = useState(() => buildPhrOverviewFormState());

  useEffect(() => {
    let active = true;

    const fetchOverview = async () => {
      if (!user?.user_id) {
        if (active) setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getPhrOverview(user.user_id);
        const normalized = buildPhrOverviewFormState(data, { name: user.name });

        if (active) {
          setFormData(normalized);
          setOriginalData(structuredClone(normalized));
        }
      } catch (error) {
        toast.error("Không thể tải hồ sơ sức khỏe");
        console.error(error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchOverview();
    return () => {
      active = false;
    };
  }, [user]);

  const handleSave = async () => {
    try {
      if (!user?.user_id) return;

      const payload = {
        personal_info: formData.personalInfo,
        vitals: formData.vitals,
        medical_history: formData.medicalHistory,
        clinical_results: formData.clinicalResults,
      };

      await updatePhrOverview(user.user_id, payload);
      setOriginalData(structuredClone(formData));
      setIsEditing(false);
      toast.success("Đã cập nhật hồ sơ sức khỏe");
    } catch (error) {
      toast.error("Lỗi khi lưu hồ sơ sức khỏe");
      console.error(error);
    }
  };

  const handleCancel = () => {
    setFormData(structuredClone(originalData));
    setIsEditing(false);
  };

  const handleInputChange = (section, field, value, subField = null) => {
    setFormData((previous) => {
      const clonedData = structuredClone(previous);
      if (subField) {
        clonedData[section][field][subField] = value;
      } else {
        clonedData[section][field] = value;
      }
      return clonedData;
    });
  };

  const handleArrayChange = (section, field, action, value = null, index = null) => {
    setFormData((previous) => {
      const clonedData = structuredClone(previous);
      const list = clonedData[section][field] || [];

      if (action === "add" && value) {
        clonedData[section][field] = [...list, value];
      } else if (action === "remove" && index !== null) {
        clonedData[section][field] = list.filter((_, currentIndex) => currentIndex !== index);
      }

      return clonedData;
    });
  };

  const promptAddTag = (section, field) => {
    const value = prompt(`Nhập nội dung mới cho ${field === "allergies" ? "Dị ứng" : "Bệnh lý"}:`);
    if (value && value.trim()) {
      handleArrayChange(section, field, "add", value.trim());
    }
  };

  if (loading) {
    return <div className="animate-pulse p-8 text-center font-medium text-on-surface-variant">Đang tải hồ sơ...</div>;
  }

  const headerAction = isEditing ? (
    <>
      <button
        type="button"
        onClick={handleCancel}
        className="rounded-2xl bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-md transition-all hover:bg-white/20"
      >
        Hủy
      </button>
      <button
        type="button"
        onClick={handleSave}
        className="rounded-2xl bg-primary px-8 py-3 font-bold text-white shadow-xl shadow-primary/20 transition-transform hover:scale-[1.02]"
      >
        Lưu hồ sơ
      </button>
    </>
  ) : (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-black text-slate-900 shadow-xl transition-all hover:scale-[1.02]"
    >
      <span className="material-symbols-outlined">edit_note</span>
      Chỉnh sửa hồ sơ
    </button>
  );

  return (
    <PhrOverviewContent
      data={formData}
      isEditing={isEditing}
      onFieldChange={handleInputChange}
      onAddTag={promptAddTag}
      onRemoveTag={(section, field, index) => handleArrayChange(section, field, "remove", null, index)}
      headerAction={headerAction}
    />
  );
}
