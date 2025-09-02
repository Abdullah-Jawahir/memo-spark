import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GoalType {
  id: string;
  name: string;
  description: string;
  unit: string;
  category: 'study' | 'engagement' | 'achievement' | 'time';
  is_active: boolean;
  default_value: number;
  min_value: number;
  max_value: number;
}

interface UserGoal {
  id: string;
  user_id: string;
  goal_type_id: string;
  target_value: number;
  current_value: number;
  is_active: boolean;
  goal_type: GoalType;
}

interface GoalManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedGoalType?: GoalType | null;
  onGoalUpdated: () => void;
}

const GoalManagementModal: React.FC<GoalManagementModalProps> = ({
  open,
  onOpenChange,
  selectedGoalType,
  onGoalUpdated,
}) => {
  const [goalTypes, setGoalTypes] = useState<GoalType[]>([]);
  const [userGoals, setUserGoals] = useState<UserGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("set-goal");

  // Set Goal Form
  const [selectedGoalTypeId, setSelectedGoalTypeId] = useState("");
  const [targetValue, setTargetValue] = useState<number>(0);

  // Custom Goal Form
  const [customGoal, setCustomGoal] = useState({
    name: "",
    description: "",
    unit: "",
    category: "study" as "study" | "engagement" | "achievement" | "time",
    target_value: 0,
    min_value: 1,
    max_value: 1000,
  });

  useEffect(() => {
    if (open) {
      fetchData();
      if (selectedGoalType) {
        setSelectedGoalTypeId(selectedGoalType.id);
        setTargetValue(selectedGoalType.default_value);
        setActiveTab("set-goal");
      }
    }
  }, [open, selectedGoalType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const [goalTypesRes, userGoalsRes] = await Promise.all([
        fetch('http://localhost:8000/api/student-goals/types', { headers }),
        fetch('http://localhost:8000/api/student-goals', { headers })
      ]);

      if (goalTypesRes.ok) {
        const goalTypesData = await goalTypesRes.json();
        setGoalTypes(goalTypesData);
      }

      if (userGoalsRes.ok) {
        const userGoalsData = await userGoalsRes.json();
        setUserGoals(userGoalsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load goal data');
    } finally {
      setLoading(false);
    }
  };

  const handleSetGoal = async () => {
    if (!selectedGoalTypeId || targetValue <= 0) {
      toast.error('Please select a goal type and enter a valid target value');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('http://localhost:8000/api/student-goals/set', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          goal_type_id: selectedGoalTypeId,
          target_value: targetValue
        })
      });

      if (!response.ok) {
        throw new Error('Failed to set goal');
      }

      toast.success('Goal set successfully!');
      onGoalUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error setting goal:', error);
      toast.error('Failed to set goal');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomGoal = async () => {
    if (!customGoal.name || !customGoal.description || !customGoal.unit || customGoal.target_value <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('http://localhost:8000/api/student-goals/custom', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customGoal)
      });

      if (!response.ok) {
        throw new Error('Failed to create custom goal');
      }

      toast.success('Custom goal created successfully!');
      onGoalUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating custom goal:', error);
      toast.error('Failed to create custom goal');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGoal = async (goalId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`http://localhost:8000/api/student-goals/${goalId}/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to toggle goal');
      }

      toast.success('Goal status updated!');
      fetchData();
    } catch (error) {
      console.error('Error toggling goal:', error);
      toast.error('Failed to update goal status');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`http://localhost:8000/api/student-goals/${goalId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete goal');
      }

      toast.success('Goal deleted successfully!');
      fetchData();
      onGoalUpdated();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    }
  };

  const getSelectedGoalType = () => {
    return goalTypes.find(gt => gt.id === selectedGoalTypeId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Your Goals</DialogTitle>
          <DialogDescription>
            Set personal goals to track your progress and stay motivated.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="set-goal">Set Goal</TabsTrigger>
            <TabsTrigger value="my-goals">My Goals</TabsTrigger>
            <TabsTrigger value="custom-goal">Create Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="set-goal" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="goal-type">Select Goal Type</Label>
                <Select value={selectedGoalTypeId} onValueChange={setSelectedGoalTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a goal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {goalTypes.map((goalType) => (
                      <SelectItem key={goalType.id} value={goalType.id}>
                        {goalType.name} ({goalType.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedGoalTypeId && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium">{getSelectedGoalType()?.name}</h4>
                    <p className="text-sm text-muted-foreground">{getSelectedGoalType()?.description}</p>
                    <div className="mt-2">
                      <Badge variant="outline" className="capitalize">
                        {getSelectedGoalType()?.category}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="target-value">
                      Target Value ({getSelectedGoalType()?.unit})
                    </Label>
                    <Input
                      id="target-value"
                      type="number"
                      value={targetValue}
                      onChange={(e) => setTargetValue(parseInt(e.target.value) || 0)}
                      min={getSelectedGoalType()?.min_value || 1}
                      max={getSelectedGoalType()?.max_value || 1000}
                      placeholder={`Default: ${getSelectedGoalType()?.default_value}`}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Range: {getSelectedGoalType()?.min_value} - {getSelectedGoalType()?.max_value}
                    </p>
                  </div>

                  <Button onClick={handleSetGoal} disabled={loading} className="w-full">
                    {loading ? 'Setting Goal...' : 'Set Goal'}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="my-goals" className="space-y-4">
            <div className="space-y-4">
              {userGoals.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-muted-foreground">No goals set yet</p>
                </div>
              ) : (
                userGoals.map((userGoal) => {
                  const progress = userGoal.target_value > 0 ?
                    (userGoal.current_value / userGoal.target_value) * 100 : 0;

                  return (
                    <Card key={userGoal.id}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{userGoal.goal_type.name}</CardTitle>
                            <CardDescription>{userGoal.goal_type.description}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleGoal(userGoal.id)}
                            >
                              {userGoal.is_active ? 'Pause' : 'Resume'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteGoal(userGoal.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{userGoal.current_value}/{userGoal.target_value} {userGoal.goal_type.unit}</span>
                          </div>
                          <Progress value={Math.min(progress, 100)} className="h-2" />
                          <div className="flex justify-between items-center">
                            <Badge variant={userGoal.is_active ? "default" : "secondary"}>
                              {userGoal.is_active ? "Active" : "Paused"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {Math.round(progress)}% Complete
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="custom-goal" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="custom-name">Goal Name</Label>
                  <Input
                    id="custom-name"
                    value={customGoal.name}
                    onChange={(e) => setCustomGoal(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Daily Reading"
                  />
                </div>

                <div>
                  <Label htmlFor="custom-unit">Unit</Label>
                  <Input
                    id="custom-unit"
                    value={customGoal.unit}
                    onChange={(e) => setCustomGoal(prev => ({ ...prev, unit: e.target.value }))}
                    placeholder="e.g., pages, minutes, exercises"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="custom-description">Description</Label>
                <Input
                  id="custom-description"
                  value={customGoal.description}
                  onChange={(e) => setCustomGoal(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this goal is about"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="custom-category">Category</Label>
                  <Select
                    value={customGoal.category}
                    onValueChange={(value) => setCustomGoal(prev => ({ ...prev, category: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="study">Study</SelectItem>
                      <SelectItem value="engagement">Engagement</SelectItem>
                      <SelectItem value="achievement">Achievement</SelectItem>
                      <SelectItem value="time">Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="custom-target">Target Value</Label>
                  <Input
                    id="custom-target"
                    type="number"
                    value={customGoal.target_value}
                    onChange={(e) => setCustomGoal(prev => ({ ...prev, target_value: parseInt(e.target.value) || 0 }))}
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="custom-min">Minimum Value</Label>
                  <Input
                    id="custom-min"
                    type="number"
                    value={customGoal.min_value}
                    onChange={(e) => setCustomGoal(prev => ({ ...prev, min_value: parseInt(e.target.value) || 1 }))}
                    min="0"
                  />
                </div>

                <div>
                  <Label htmlFor="custom-max">Maximum Value</Label>
                  <Input
                    id="custom-max"
                    type="number"
                    value={customGoal.max_value}
                    onChange={(e) => setCustomGoal(prev => ({ ...prev, max_value: parseInt(e.target.value) || 1000 }))}
                    min="1"
                  />
                </div>
              </div>

              <Button onClick={handleCreateCustomGoal} disabled={loading} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                {loading ? 'Creating...' : 'Create Custom Goal'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GoalManagementModal;
