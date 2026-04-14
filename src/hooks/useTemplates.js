import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; // 설정하신 supabase 설정 파일

export function useTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplates() {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Template 로딩 실패:', error);
      } else {
        setTemplates(data);
      }
      setLoading(false);
    }
    fetchTemplates();
  }, []);

  return { templates, loading };
}